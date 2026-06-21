import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import { config } from '../config';
import { ComplianceTriggerMessage } from '../agent/contracts';
import { agentTools } from '../agent/tools';
import { runComplianceAgent } from '../agent/runner';

// ─── SQS Compliance Handler ───────────────────────────────────────────────────
//
// In mock mode (no SQS_COMPLIANCE_QUEUE_URL): logs startup, does nothing.
// In live mode: long-polls SQS every poll interval, processes messages.
//
// Message shape (EventBridge → SQS, via Terraform EventBridge rule in Phase 3):
// {
//   "shipmentId": "uuid",
//   "trackingNumber": "CT-2026-123456",
//   "newStatus": "IN_TRANSIT",
//   "triggeredAt": "2026-06-14T..."
// }

class ComplianceHandler {
  private client: SQSClient | null = null;
  private queueUrl: string;
  private running = false;

  constructor() {
    this.queueUrl = config.sqsQueueUrl;

    if (config.region && this.queueUrl && !config.mockAgent) {
      this.client = new SQSClient({ region: config.region });
      console.log(`[compliance-handler] SQS client initialized — queue: ${this.queueUrl}`);
    } else {
      console.log('[compliance-handler] Mock mode — SQS polling disabled');
    }
  }

  /** Start the polling loop (non-blocking — runs in the background). */
  start(): void {
    if (!this.client || !this.queueUrl) {
      console.log('[compliance-handler] No SQS client — skipping poll loop');
      return;
    }

    this.running = true;
    console.log('[compliance-handler] Starting SQS poll loop...');
    this.poll().catch((err) => {
      console.error('[compliance-handler] Poll loop crashed:', err);
    });
  }

  stop(): void {
    this.running = false;
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        await this.receiveAndProcess();
      } catch (err) {
        console.error('[compliance-handler] Poll error:', err);
        // Back off before retrying
        await sleep(config.sqsPollIntervalMs * 2);
      }
    }
  }

  private async receiveAndProcess(): Promise<void> {
    if (!this.client) return;

    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: config.sqsMaxMessages,
      WaitTimeSeconds: 20,     // Long polling — reduces empty-receive costs
      VisibilityTimeout: 300,  // 5 minutes — enough for a full agent run
      MessageAttributeNames: ['All'],
    });

    const response = await this.client.send(command);
    const messages = response.Messages ?? [];

    if (messages.length === 0) {
      // No messages — wait before polling again
      await sleep(config.sqsPollIntervalMs);
      return;
    }

    console.log(`[compliance-handler] Received ${messages.length} message(s)`);

    // Process messages concurrently (up to SQS max batch size)
    await Promise.allSettled(
      messages.map((msg) => this.processMessage(msg))
    );
  }

  private async processMessage(msg: Message): Promise<void> {
    if (!msg.Body || !msg.ReceiptHandle) return;

    let trigger: ComplianceTriggerMessage;

    try {
      // EventBridge wraps the event in a "detail" envelope
      const parsed = JSON.parse(msg.Body);
      // Support both direct payload and EventBridge envelope
      const detail = parsed.detail ?? parsed;
      trigger = detail as ComplianceTriggerMessage;
    } catch (err) {
      console.error('[compliance-handler] Failed to parse message:', msg.Body);
      // Delete malformed messages so they don't block the queue
      await this.deleteMessage(msg.ReceiptHandle);
      return;
    }

    console.log(`[compliance-handler] Processing compliance check — shipment: ${trigger.shipmentId}`);

    try {
      await runComplianceAgent(trigger, agentTools);

      // Only delete on success — failed messages stay in queue for retry
      await this.deleteMessage(msg.ReceiptHandle);
      console.log(`[compliance-handler] Completed — shipment: ${trigger.shipmentId}`);
    } catch (err) {
      console.error(`[compliance-handler] Agent failed for shipment ${trigger.shipmentId}:`, err);
      // Message returns to queue after VisibilityTimeout for retry
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    if (!this.client) return;
    await this.client.send(new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    }));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const complianceHandler = new ComplianceHandler();

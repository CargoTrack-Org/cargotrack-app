import {
  DynamoDBClient,
  PutItemCommand,
  type PutItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { config } from '../config';

// ─── Audit Event Shape ────────────────────────────────────────────────────────

export interface AuditEventItem {
  pk: string;          // e.g. "SHIPMENT#<id>"
  sk: string;          // e.g. "COMPLIANCE#<timestamp>"
  eventType: string;   // e.g. "compliance.passed"
  shipmentId: string;
  agentRunId: string;
  summary: string;
  timestamp: string;
}

// ─── DynamoDB Audit Service ───────────────────────────────────────────────────

class DynamoAuditService {
  private client: DynamoDBClient | null = null;
  private tableName: string;

  constructor() {
    this.tableName = config.dynamoAuditTable;

    if (config.region && !config.mockAgent) {
      this.client = new DynamoDBClient({ region: config.region });
      console.log(`[dynamodb] Audit client initialized — table: ${this.tableName}`);
    } else {
      console.log('[dynamodb] Mock mode — audit events will be logged only');
    }
  }

  async writeAuditEvent(item: AuditEventItem): Promise<void> {
    // Always log locally
    console.log(`[audit] ${item.eventType} — shipment: ${item.shipmentId}, run: ${item.agentRunId}`);
    console.log(`[audit] Summary: ${item.summary}`);

    if (!this.client) {
      // Mock mode: log and return
      console.log(`[audit][MOCK] Would write to DynamoDB: ${JSON.stringify(item, null, 2)}`);
      return;
    }

    const params: PutItemCommandInput = {
      TableName: this.tableName,
      Item: {
        // Composite key for efficient querying by shipment
        PK: { S: item.pk },
        SK: { S: item.sk },
        EventType: { S: item.eventType },
        ShipmentId: { S: item.shipmentId },
        AgentRunId: { S: item.agentRunId },
        Summary: { S: item.summary },
        Timestamp: { S: item.timestamp },
        // TTL: 90 days — audit records expire automatically
        TTL: {
          N: String(Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60),
        },
      },
    };

    try {
      await this.client.send(new PutItemCommand(params));
      console.log(`[dynamodb] Audit event written: ${item.pk}/${item.sk}`);
    } catch (err) {
      // Non-fatal: log but don't fail the compliance run
      console.error('[dynamodb] Failed to write audit event:', err);
    }
  }
}

export const dynamoAuditService = new DynamoAuditService();

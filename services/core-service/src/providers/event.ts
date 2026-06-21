import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';

// ─── Interface ───────────────────────────────────────────────────────────────
// Kept deliberately thin so the Document Service and future AI Service can
// import and implement this same interface independently.

export interface EventPublisher {
  publish(eventType: string, data: unknown): Promise<void>;
}

// ─── Console (Local / Test) ───────────────────────────────────────────────────
// Used when AWS credentials / EVENT_BUS_NAME are absent (local docker-compose).
// Rollback: set EVENT_BUS_NAME="" to revert to this at runtime without a deploy.

export class ConsoleLoggerEventPublisher implements EventPublisher {
  async publish(eventType: string, data: unknown): Promise<void> {
    console.log(`[EventPublisher][LOCAL] ${eventType}:`, JSON.stringify(data));
  }
}

// ─── AWS EventBridge ──────────────────────────────────────────────────────────
// Publishes to the cargotrack custom event bus.
// Source is always 'cargotrack.core' so EventBridge rules can filter by service.
// Non-fatal: if AWS call fails the main request still succeeds (fire-and-forget).

export class EventBridgePublisher implements EventPublisher {
  private client: EventBridgeClient;
  private eventBusName: string;

  constructor(region: string, eventBusName: string) {
    this.client = new EventBridgeClient({ region });
    this.eventBusName = eventBusName;
  }

  async publish(eventType: string, data: unknown): Promise<void> {
    // Map eventType → EventBridge DetailType (e.g. "shipment.created" → "ShipmentCreated")
    const detailType = eventType
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    const entry: PutEventsRequestEntry = {
      EventBusName: this.eventBusName,
      Source: 'cargotrack.core',
      DetailType: detailType,
      Detail: JSON.stringify({ eventType, ...( data as object ) }),
      Time: new Date(),
    };

    try {
      const response = await this.client.send(
        new PutEventsCommand({ Entries: [entry] })
      );

      if (response.FailedEntryCount && response.FailedEntryCount > 0) {
        console.error(
          `[EventBridgePublisher] Failed to publish "${eventType}":`,
          JSON.stringify(response.Entries, null, 2)
        );
      } else {
        console.log(
          `[EventBridgePublisher] Published "${eventType}" → DetailType: "${detailType}"`
        );
      }
    } catch (error) {
      // Non-fatal: log error but do NOT re-throw. The API response should not
      // fail because an audit event could not be published.
      console.error(`[EventBridgePublisher] PutEvents error for "${eventType}":`, error);
    }
  }
}

// ─── Factory: choose implementation based on environment ─────────────────────
function createEventPublisher(): EventPublisher {
  const region = process.env.AWS_DEFAULT_REGION;
  const eventBusName = process.env.EVENT_BUS_NAME;

  if (region && eventBusName) {
    console.log(
      `[EventPublisher] Using EventBridgePublisher — bus: ${eventBusName}, region: ${region}`
    );
    return new EventBridgePublisher(region, eventBusName);
  }

  console.log(
    '[EventPublisher] AWS_DEFAULT_REGION or EVENT_BUS_NAME not set — using ConsoleLoggerEventPublisher'
  );
  return new ConsoleLoggerEventPublisher();
}

// Singleton — shared across all routes that import this module.
export const eventPublisher: EventPublisher = createEventPublisher();

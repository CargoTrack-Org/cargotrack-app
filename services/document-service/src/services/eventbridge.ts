import { EventBridgeClient, PutEventsCommand, PutEventsRequestEntry } from '@aws-sdk/client-eventbridge';

export interface DocumentUploadedDetail {
  shipmentId: string;
  documentId: string;
  fileName: string;
  documentType: string;
  uploadedBy: string;
  uploadTimestamp: string;
}

function createClient(): EventBridgeClient | null {
  const region = process.env.AWS_DEFAULT_REGION;

  if (!region) {
    console.warn('[eventbridge] AWS_DEFAULT_REGION not set — EventBridge publishing disabled');
    return null;
  }

  return new EventBridgeClient({ region });
}

const client = createClient();

export async function publishDocumentUploaded(detail: DocumentUploadedDetail): Promise<void> {
  const eventBusName = process.env.EVENT_BUS_NAME;

  if (!client) {
    console.warn('[eventbridge] Client not initialised — skipping event publish');
    return;
  }

  if (!eventBusName) {
    console.warn('[eventbridge] EVENT_BUS_NAME not set — skipping event publish');
    return;
  }

  const entry: PutEventsRequestEntry = {
    EventBusName: eventBusName,
    Source: 'cargotrack.documents',
    DetailType: 'DocumentUploaded',
    Detail: JSON.stringify(detail),
  };

  try {
    const command = new PutEventsCommand({ Entries: [entry] });
    const response = await client.send(command);

    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
      console.error('[eventbridge] Failed to publish event:', JSON.stringify(response.Entries, null, 2));
    } else {
      console.log(`[eventbridge] Published DocumentUploaded — documentId: ${detail.documentId}, shipmentId: ${detail.shipmentId}`);
    }
  } catch (error) {
    console.error('[eventbridge] PutEvents error:', error);
  }
}

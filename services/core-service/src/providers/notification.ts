import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface for future AWS SNS replacement
export interface NotificationProvider {
  send(userId: string, title: string, message: string): Promise<void>;
}

// Current implementation: Database notification storage
export class DatabaseNotificationProvider implements NotificationProvider {
  async send(userId: string, title: string, message: string): Promise<void> {
    await prisma.notification.create({
      data: { userId, title, message },
    });
    console.log(`[Notification] User ${userId}: ${title}`);
  }
}

// Singleton instance
export const notificationProvider: NotificationProvider = new DatabaseNotificationProvider();

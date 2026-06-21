import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Parser } from 'json2csv';
import { authenticate } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

/**
 * @swagger
 * /api/reports/shipment-history:
 *   get:
 *     summary: Download shipment history CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema: { type: string }
 */
router.get('/shipment-history', authenticate, async (req: Request, res: Response) => {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { userId: req.user!.userId },
      include: { trackingEvents: { orderBy: { timestamp: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = shipments.flatMap((s) =>
      s.trackingEvents.map((e) => ({
        TrackingNumber: s.trackingNumber,
        Title: s.title,
        EventStatus: e.status,
        EventDescription: e.description,
        EventLocation: e.location || '',
        EventTimestamp: e.timestamp.toISOString(),
        Origin: s.origin,
        Destination: s.destination,
      }))
    );

    if (rows.length === 0) {
      res.status(200).send('No data available');
      return;
    }

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shipment-history.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Shipment history report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * @swagger
 * /api/reports/shipment-summary:
 *   get:
 *     summary: Download shipment summary CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema: { type: string }
 */
router.get('/shipment-summary', authenticate, async (req: Request, res: Response) => {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });

    const rows = shipments.map((s) => ({
      TrackingNumber: s.trackingNumber,
      Title: s.title,
      Status: s.status,
      SenderName: s.senderName,
      ReceiverName: s.receiverName,
      Origin: s.origin,
      Destination: s.destination,
      ShipmentType: s.shipmentType,
      Weight: s.weight,
      EstimatedDelivery: s.estimatedDeliveryDate?.toISOString() || '',
      CreatedAt: s.createdAt.toISOString(),
    }));

    if (rows.length === 0) {
      res.status(200).send('No data available');
      return;
    }

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shipment-summary.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Shipment summary report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;

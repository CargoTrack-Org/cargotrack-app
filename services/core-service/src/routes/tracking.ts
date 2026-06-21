import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * @swagger
 * /api/tracking/{trackingNumber}:
 *   get:
 *     summary: Get shipment tracking info (public)
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema: { type: string }
 *         description: "Tracking number (e.g. CT-2026-123456)"
 *     responses:
 *       200:
 *         description: Tracking information
 *       404:
 *         description: Shipment not found
 */
router.get('/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { trackingNumber: req.params.trackingNumber },
      select: {
        trackingNumber: true,
        title: true,
        origin: true,
        destination: true,
        status: true,
        shipmentType: true,
        estimatedDeliveryDate: true,
        createdAt: true,
        trackingEvents: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            status: true,
            location: true,
            description: true,
            timestamp: true,
          },
        },
      },
    });

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    res.json(shipment);
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking info' });
  }
});

export default router;

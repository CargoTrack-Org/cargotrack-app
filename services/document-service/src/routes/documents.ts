import { Router, Request, Response } from 'express';
import { PrismaClient, DocumentType } from '@prisma/client';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { storageProvider } from '../providers/storage';
import { publishDocumentUploaded } from '../services/eventbridge';

const prisma = new PrismaClient();
const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Use the Prisma enum values for validation — single source of truth.
const ALLOWED_DOC_TYPES = Object.values(DocumentType);

/**
 * @swagger
 * /api/documents/shipment/{shipmentId}:
 *   post:
 *     summary: Upload a document for a shipment
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [INVOICE, BILL_OF_LADING, SHIPPING_MANIFEST, CUSTOMS, PROOF_OF_DELIVERY, SHIPPING_LABEL, OTHER]
 *     responses:
 *       201:
 *         description: Document uploaded
 */
router.post('/shipment/:shipmentId', authenticate, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { documentType } = req.body;
    if (!documentType || !ALLOWED_DOC_TYPES.includes(documentType as DocumentType)) {
      res.status(400).json({
        error: `Invalid document type. Must be one of: ${ALLOWED_DOC_TYPES.join(', ')}`,
      });
      return;
    }

    // FIXED: Admins can upload documents for any shipment.
    // Regular users can only upload for their own shipments.
    let shipment;
    if (req.user!.role === 'ADMIN') {
      shipment = await prisma.shipment.findUnique({
        where: { id: req.params.shipmentId },
      });
    } else {
      shipment = await prisma.shipment.findFirst({
        where: { id: req.params.shipmentId, userId: req.user!.userId },
      });
    }

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const ext = path.extname(req.file.originalname);
    const fileName = `documents/${shipment.trackingNumber}/${uuidv4()}${ext}`;
    await storageProvider.upload(req.file.buffer, fileName);

    const doc = await prisma.shipmentDocument.create({
      data: {
        fileName,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: documentType as DocumentType,
        shipmentId: req.params.shipmentId,
      },
    });

    // Respond immediately; publish event asynchronously (fire-and-forget)
    res.status(201).json(doc);

    await publishDocumentUploaded({
      shipmentId: req.params.shipmentId,
      documentId: doc.id,
      fileName: doc.fileName,
      documentType: doc.documentType,
      uploadedBy: req.user!.userId,
      uploadTimestamp: doc.uploadedAt.toISOString(),
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * @swagger
 * /api/documents/shipment/{shipmentId}:
 *   get:
 *     summary: List documents for a shipment
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of documents
 */
router.get('/shipment/:shipmentId', authenticate, async (req: Request, res: Response) => {
  try {
    // Admins can list documents for any shipment; users only for their own.
    let shipment;
    if (req.user!.role === 'ADMIN') {
      shipment = await prisma.shipment.findUnique({ where: { id: req.params.shipmentId } });
    } else {
      shipment = await prisma.shipment.findFirst({
        where: { id: req.params.shipmentId, userId: req.user!.userId },
      });
    }

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const documents = await prisma.shipmentDocument.findMany({
      where: { shipmentId: req.params.shipmentId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File download
 */
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const doc = await prisma.shipmentDocument.findUnique({
      where: { id: req.params.id },
      include: { shipment: true },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Allow access if user owns the shipment OR is admin
    if (doc.shipment.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const fileBuffer = await storageProvider.download(doc.fileName);
    res.setHeader('Content-Type', doc.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

export default router;

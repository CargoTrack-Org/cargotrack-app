-- ============================================================
-- Migration: v3_compliance_models
-- Description:
--   1. Add DocumentType enum (replaces raw TEXT documentType)
--   2. Add ComplianceSeverity, ComplianceStatus, FindingType enums
--   3. Add carrierName (nullable) to Shipment
--   4. Migrate ShipmentDocument.documentType TEXT → DocumentType enum
--   5. Create ComplianceReport table
--   6. Create ComplianceFinding table
-- ============================================================

-- Step 1: Create new enums
-- DocumentType enum — 'OTHER' serves as the migration default for existing rows.
CREATE TYPE "DocumentType" AS ENUM (
  'INVOICE',
  'BILL_OF_LADING',
  'SHIPPING_MANIFEST',
  'CUSTOMS',
  'PROOF_OF_DELIVERY',
  'SHIPPING_LABEL',
  'OTHER'
);

CREATE TYPE "ComplianceSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'PARTIAL');

CREATE TYPE "FindingType" AS ENUM (
  'MISSING_DOCUMENT',
  'DATA_MISMATCH',
  'COMPLIANCE_RISK',
  'VALIDATION_ERROR'
);

-- Step 2: Add carrierName to Shipment (nullable — no backfill needed)
ALTER TABLE "Shipment" ADD COLUMN "carrierName" TEXT;

-- Step 3: Migrate ShipmentDocument.documentType from TEXT → DocumentType enum
-- 3a. Add a new typed column alongside the existing one
ALTER TABLE "ShipmentDocument" ADD COLUMN "documentType_new" "DocumentType" NOT NULL DEFAULT 'OTHER';

-- 3b. Copy existing values, mapping known strings; everything else → OTHER
UPDATE "ShipmentDocument" SET "documentType_new" = CASE
  WHEN "documentType" = 'INVOICE'           THEN 'INVOICE'::"DocumentType"
  WHEN "documentType" = 'SHIPPING_LABEL'    THEN 'SHIPPING_LABEL'::"DocumentType"
  WHEN "documentType" = 'PROOF_OF_DELIVERY' THEN 'PROOF_OF_DELIVERY'::"DocumentType"
  WHEN "documentType" = 'CUSTOMS'           THEN 'CUSTOMS'::"DocumentType"
  WHEN "documentType" = 'BILL_OF_LADING'    THEN 'BILL_OF_LADING'::"DocumentType"
  WHEN "documentType" = 'SHIPPING_MANIFEST' THEN 'SHIPPING_MANIFEST'::"DocumentType"
  ELSE 'OTHER'::"DocumentType"
END;

-- 3c. Drop the old text column and rename the new one
ALTER TABLE "ShipmentDocument" DROP COLUMN "documentType";
ALTER TABLE "ShipmentDocument" RENAME COLUMN "documentType_new" TO "documentType";

-- Step 4: Create ComplianceReport table
CREATE TABLE "ComplianceReport" (
    "id"         TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status"     "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
    "summary"    TEXT,
    "agentRunId" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceReport_pkey" PRIMARY KEY ("id")
);

-- One report per shipment
CREATE UNIQUE INDEX "ComplianceReport_shipmentId_key" ON "ComplianceReport"("shipmentId");

-- FK → Shipment (cascade delete: removing a shipment removes its report)
ALTER TABLE "ComplianceReport"
  ADD CONSTRAINT "ComplianceReport_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create ComplianceFinding table
CREATE TABLE "ComplianceFinding" (
    "id"          TEXT NOT NULL,
    "reportId"    TEXT NOT NULL,
    "documentId"  TEXT,
    "findingType" "FindingType" NOT NULL,
    "severity"    "ComplianceSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "detail"      JSONB,
    "resolvedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceFinding_pkey" PRIMARY KEY ("id")
);

-- FK → ComplianceReport
ALTER TABLE "ComplianceFinding"
  ADD CONSTRAINT "ComplianceFinding_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "ComplianceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → ShipmentDocument (nullable — a finding may not reference a specific document)
ALTER TABLE "ComplianceFinding"
  ADD CONSTRAINT "ComplianceFinding_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ShipmentDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

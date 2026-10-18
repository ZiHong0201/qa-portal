-- Fees move from per-subject monthly bills to standalone receipts, priced by
-- grade and number of subjects. Nothing had been billed or paid under the old
-- tables, so they are simply replaced.
DROP TABLE "FeePayment";
DROP TABLE "FeeBill";
DROP TABLE "StudentFeeRate";
ALTER TABLE "Subject" DROP COLUMN "monthlyFeeSen";

-- CreateTable
CREATE TABLE "FeeReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subjects" TEXT NOT NULL,
    "startMonth" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "normalSen" INTEGER NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "priceNote" TEXT,
    "method" TEXT NOT NULL,
    "paidOn" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "sentAt" DATETIME,
    "sendError" TEXT,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "voidedById" TEXT
);
CREATE UNIQUE INDEX "FeeReceipt_receiptNo_key" ON "FeeReceipt"("receiptNo");
CREATE INDEX "FeeReceipt_createdAt_idx" ON "FeeReceipt"("createdAt");
CREATE INDEX "FeeReceipt_email_idx" ON "FeeReceipt"("email");

-- Grade 6 has its own fee, so it needs to exist as a grade - listed before Form 1.
INSERT INTO "Grade" ("id", "name", "order", "createdAt")
SELECT 'grade_6', 'Grade 6', COALESCE(MIN("order"), 0) - 1, CURRENT_TIMESTAMP FROM "Grade"
WHERE NOT EXISTS (SELECT 1 FROM "Grade" WHERE "name" = 'Grade 6');

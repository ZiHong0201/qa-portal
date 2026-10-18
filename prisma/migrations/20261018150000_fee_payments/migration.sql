-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "monthlyFeeSen" INTEGER;

-- CreateTable
CREATE TABLE "StudentFeeRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "monthlyFeeSen" INTEGER NOT NULL,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeeBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "grade" TEXT,
    "month" TEXT NOT NULL,
    "lines" TEXT NOT NULL,
    "adjustmentSen" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "paidOn" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "voidedById" TEXT,
    CONSTRAINT "FeePayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "FeeBill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeRate_studentId_subject_key" ON "StudentFeeRate"("studentId", "subject");

-- CreateIndex
CREATE INDEX "FeeBill_month_idx" ON "FeeBill"("month");

-- CreateIndex
CREATE UNIQUE INDEX "FeeBill_studentId_month_key" ON "FeeBill"("studentId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_receiptNo_key" ON "FeePayment"("receiptNo");

-- CreateIndex
CREATE INDEX "FeePayment_billId_idx" ON "FeePayment"("billId");

-- CreateIndex
CREATE INDEX "FeePayment_studentId_idx" ON "FeePayment"("studentId");


-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN "rejectedAt" DATETIME;
ALTER TABLE "Redemption" ADD COLUMN "rejectedById" TEXT;
ALTER TABLE "Redemption" ADD COLUMN "rejectionReason" TEXT;


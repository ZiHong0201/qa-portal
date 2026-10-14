-- AlterTable
ALTER TABLE "User" ADD COLUMN "suspendedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "suspendedById" TEXT;
ALTER TABLE "User" ADD COLUMN "suspensionReason" TEXT;


-- CreateTable
CREATE TABLE "PortalReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" DATETIME,
    "triggeredById" TEXT,
    "snapshotUrl" TEXT,
    "submissionsCleared" INTEGER NOT NULL DEFAULT 0,
    "checkInsCleared" INTEGER NOT NULL DEFAULT 0,
    "adjustmentsCleared" INTEGER NOT NULL DEFAULT 0,
    "redemptionsCleared" INTEGER NOT NULL DEFAULT 0,
    "petPurchasesCleared" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "PortalReset_scheduledFor_idx" ON "PortalReset"("scheduledFor");

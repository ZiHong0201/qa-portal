-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Announcement_isActive_startsAt_endsAt_idx" ON "Announcement"("isActive", "startsAt", "endsAt");

-- CreateTable
CREATE TABLE "PopupAd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "PopupAd_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PopupAd_isActive_startsAt_endsAt_idx" ON "PopupAd"("isActive", "startsAt", "endsAt");

-- Tuition centres: students belong to one, teachers are given some, and
-- gifts, notices and pop-ups can be kept to some.
--
-- Columns are added with ALTER TABLE ... ADD COLUMN rather than the
-- copy-and-rename Prisma generates. Rebuilding "User" means dropping it, and
-- every table that cascades from User would lose its rows if foreign keys
-- were enforced during that drop - not a risk worth taking on the live data.
-- Nothing existing is changed: every student starts with no centre, and every
-- gift and notice with no centre rows, which means every centre.

-- CreateTable
CREATE TABLE "Centre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TeacherCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherCentre_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogueItemCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catalogueItemId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    CONSTRAINT "CatalogueItemCentre_catalogueItemId_fkey" FOREIGN KEY ("catalogueItemId") REFERENCES "CatalogueItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogueItemCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnnouncementCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    CONSTRAINT "AnnouncementCentre_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PopupAdCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "popupAdId" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    CONSTRAINT "PopupAdCentre_popupAdId_fkey" FOREIGN KEY ("popupAdId") REFERENCES "PopupAd" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PopupAdCentre_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "Centre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "centreId" TEXT REFERENCES "Centre" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "AccountRequest" ADD COLUMN "centreId" TEXT REFERENCES "Centre" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_centreId_idx" ON "User"("centreId");

-- CreateIndex
CREATE UNIQUE INDEX "Centre_name_key" ON "Centre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCentre_teacherId_centreId_key" ON "TeacherCentre"("teacherId", "centreId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueItemCentre_catalogueItemId_centreId_key" ON "CatalogueItemCentre"("catalogueItemId", "centreId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementCentre_announcementId_centreId_key" ON "AnnouncementCentre"("announcementId", "centreId");

-- CreateIndex
CREATE UNIQUE INDEX "PopupAdCentre_popupAdId_centreId_key" ON "PopupAdCentre"("popupAdId", "centreId");

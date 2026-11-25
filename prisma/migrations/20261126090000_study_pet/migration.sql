-- Replace the virtual cat with the study pet.
--
-- Columns are removed with ALTER TABLE ... DROP COLUMN rather than the
-- copy-and-rename Prisma generates. Rebuilding "User" means dropping it, and
-- every table that cascades from User would lose its rows if foreign keys
-- were enforced during that drop - not a risk worth taking on the live data.

-- The cat's own tables, children first.
DROP TABLE "PetPurchase";
DROP TABLE "PetOwnedItem";
DROP TABLE "Pet";
DROP TABLE "PetItem";

-- Per-student access to the cat, and the gift that unlocked it.
ALTER TABLE "User" DROP COLUMN "petEnabled";
ALTER TABLE "CatalogueItem" DROP COLUMN "grantsPet";
ALTER TABLE "PortalReset" DROP COLUMN "petPurchasesCleared";

-- CreateTable
CREATE TABLE "StudyPet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "element" TEXT,
    "name" TEXT,
    "hatchedAt" DATETIME,
    "rare" BOOLEAN NOT NULL DEFAULT false,
    "growth" INTEGER NOT NULL DEFAULT 0,
    "studyDay" TEXT,
    "todayCount" INTEGER NOT NULL DEFAULT 0,
    "prevStudyDay" TEXT,
    "goalDay" TEXT,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyPet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyPet_ownerId_key" ON "StudyPet"("ownerId");

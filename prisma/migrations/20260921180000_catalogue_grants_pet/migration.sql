-- AlterTable: a catalogue item that unlocks the virtual cat when redeemed
ALTER TABLE "CatalogueItem" ADD COLUMN "grantsPet" BOOLEAN NOT NULL DEFAULT false;

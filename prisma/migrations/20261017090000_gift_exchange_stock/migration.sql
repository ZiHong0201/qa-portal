-- AlterTable
ALTER TABLE "CatalogueItem" ADD COLUMN "limitPerStudent" INTEGER;
ALTER TABLE "CatalogueItem" ADD COLUMN "stock" INTEGER;

-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "Redemption" ADD COLUMN "deliveredById" TEXT;

-- CreateIndex
CREATE INDEX "Redemption_deliveredAt_idx" ON "Redemption"("deliveredAt");


-- An exchange that unlocks the cat has nothing to hand over, so the ones made
-- before delivery tracking existed are marked done. Physical gifts are left
-- pending: whether each was handed over is not recorded anywhere, and a gift
-- wrongly marked delivered would be quietly forgotten, while one wrongly left
-- pending costs the admin a click.
UPDATE "Redemption" SET "deliveredAt" = "createdAt"
WHERE "catalogueItemId" IN (SELECT "id" FROM "CatalogueItem" WHERE "grantsPet" = 1);

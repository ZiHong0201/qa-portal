-- Several extra charges instead of one, and tax.

-- The charges a receipt can tick, now ordered by when they were added. SQLite
-- cannot add a column defaulting to the current time, so the table (one row,
-- the material fee) is rebuilt.
CREATE TABLE "new_FeeExtra" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FeeExtra" ("key", "label", "amountSen", "updatedAt")
SELECT "key", "label", "amountSen", "updatedAt" FROM "FeeExtra";
DROP TABLE "FeeExtra";
ALTER TABLE "new_FeeExtra" RENAME TO "FeeExtra";

-- Settings, starting with no tax.
CREATE TABLE "FeeSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
INSERT INTO "FeeSetting" ("key", "value") VALUES ('taxRateBp', '0');

-- A receipt's charges become a list; the one charge a receipt could have so
-- far moves into it, under the name it was made with.
ALTER TABLE "FeeReceipt" ADD COLUMN "extras" TEXT NOT NULL DEFAULT '[]';
UPDATE "FeeReceipt" SET "extras" = json_array(json_object('label', COALESCE("extraLabel", 'Material fee'), 'amountSen', "extraSen"))
WHERE "extraSen" > 0;
ALTER TABLE "FeeReceipt" DROP COLUMN "extraLabel";

ALTER TABLE "FeeReceipt" ADD COLUMN "taxRateBp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FeeReceipt" ADD COLUMN "taxSen" INTEGER NOT NULL DEFAULT 0;

-- A discount the admin gives on top of any promotion, and why.
ALTER TABLE "FeeReceipt" ADD COLUMN "extraDiscountSen" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FeeReceipt" ADD COLUMN "discountNote" TEXT;

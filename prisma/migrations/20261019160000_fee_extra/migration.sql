-- A one-off charge a receipt can include with a tick.
CREATE TABLE "FeeExtra" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "amountSen" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- The material cost and delivery fee, as first given.
INSERT INTO "FeeExtra" ("key", "label", "amountSen", "updatedAt")
VALUES ('material', 'Material cost & delivery fee', 3000, CURRENT_TIMESTAMP);

-- What a receipt charged for it, kept on the receipt.
ALTER TABLE "FeeReceipt" ADD COLUMN "extraLabel" TEXT;
ALTER TABLE "FeeReceipt" ADD COLUMN "extraSen" INTEGER NOT NULL DEFAULT 0;

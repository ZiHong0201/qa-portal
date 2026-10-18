-- Receipt numbers become four digits with no prefix: 0001, 0002 and so on.
-- The receipts made before - "YH-00001" to "YH-00003" and then "1" - are
-- renumbered in the order they were made, so the sequence carries on from
-- them. (createdAt is stored as ISO text, which sorts in time order.)
UPDATE "FeeReceipt" SET "receiptNo" = printf('%04d', (
  SELECT COUNT(*) FROM "FeeReceipt" AS f2
  WHERE f2."createdAt" < "FeeReceipt"."createdAt"
     OR (f2."createdAt" = "FeeReceipt"."createdAt" AND f2."id" <= "FeeReceipt"."id")
));

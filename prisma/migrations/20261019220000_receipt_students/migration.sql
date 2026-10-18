-- A receipt is billed to a parent and can cover several children, each with
-- their own grade, subjects and months. The receipts made so far named the
-- student as the payer; each becomes a receipt for that one child, billed
-- under the same name, so it reads as before.
ALTER TABLE "FeeReceipt" ADD COLUMN "students" TEXT NOT NULL DEFAULT '[]';

UPDATE "FeeReceipt" SET "students" = json_array(json_object(
  'name', "name",
  'grade', "grade",
  'subjects', json("subjects"),
  'startMonth', "startMonth",
  'months', "months",
  'normalSen', "normalSen",
  'tuitionSen', "amountSen" - "extraSen" - "taxSen" + "extraDiscountSen",
  'priceNote', "priceNote"
));

ALTER TABLE "FeeReceipt" DROP COLUMN "grade";
ALTER TABLE "FeeReceipt" DROP COLUMN "subjects";
ALTER TABLE "FeeReceipt" DROP COLUMN "startMonth";
ALTER TABLE "FeeReceipt" DROP COLUMN "months";
ALTER TABLE "FeeReceipt" DROP COLUMN "priceNote";

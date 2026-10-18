-- CreateTable
CREATE TABLE "FeePrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "band" TEXT NOT NULL,
    "subjects" INTEGER NOT NULL,
    "monthlySen" INTEGER NOT NULL,
    "promoMonths" INTEGER,
    "promoSen" INTEGER,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FeePrice_band_subjects_key" ON "FeePrice"("band", "subjects");


-- The prices as first given; from here on they are edited on the Prices page.
INSERT INTO "FeePrice" ("id", "band", "subjects", "monthlySen", "promoMonths", "promoSen", "updatedAt") VALUES
  ('fp_G6_1',  'G6',  1,  6500, 6,  39900, CURRENT_TIMESTAMP),
  ('fp_F13_1', 'F13', 1,  7000, 6,  39900, CURRENT_TIMESTAMP),
  ('fp_F13_2', 'F13', 2, 14000, 3,  39900, CURRENT_TIMESTAMP),
  ('fp_F13_3', 'F13', 3, 20500, 3,  59900, CURRENT_TIMESTAMP),
  ('fp_F13_4', 'F13', 4, 26800, 3,  78800, CURRENT_TIMESTAMP),
  ('fp_F45_1', 'F45', 1,  8000, 6,  45900, CURRENT_TIMESTAMP),
  ('fp_F45_2', 'F45', 2, 15500, 3,  45900, CURRENT_TIMESTAMP),
  ('fp_F45_3', 'F45', 3, 22000, 3,  64900, CURRENT_TIMESTAMP),
  ('fp_F45_4', 'F45', 4, 28600, 3,  84900, CURRENT_TIMESTAMP),
  ('fp_F45_5', 'F45', 5, 35500, 3, 105900, CURRENT_TIMESTAMP),
  ('fp_F45_6', 'F45', 6, 41500, 3, 123900, CURRENT_TIMESTAMP);

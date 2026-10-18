-- CreateTable
CREATE TABLE "FeeSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeSubject_name_key" ON "FeeSubject"("name");


-- Start from the portal's current subjects, so receipts can be made straight away;
-- from here on the two lists are kept separately.
INSERT INTO "FeeSubject" ("id", "name", "createdAt")
SELECT 'fs_' || "id", "name", CURRENT_TIMESTAMP FROM "Subject";

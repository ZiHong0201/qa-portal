-- CreateTable
CREATE TABLE "QuestionSetGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionSetId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionSetGrade_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSetGrade_questionSetId_grade_key" ON "QuestionSetGrade"("questionSetId", "grade");

-- Backfill: carry each set's existing single grade into the new table
-- before the column is dropped below.
INSERT INTO "QuestionSetGrade" ("id", "questionSetId", "grade", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "grade", CURRENT_TIMESTAMP
FROM "QuestionSet"
WHERE "grade" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuestionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL DEFAULT 'General',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "simulationUrl" TEXT,
    CONSTRAINT "QuestionSet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_QuestionSet" ("id", "title", "description", "subject", "isActive", "createdAt", "updatedAt", "createdById", "simulationUrl") SELECT "id", "title", "description", "subject", "isActive", "createdAt", "updatedAt", "createdById", "simulationUrl" FROM "QuestionSet";
DROP TABLE "QuestionSet";
ALTER TABLE "new_QuestionSet" RENAME TO "QuestionSet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "AnswerReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "questionSetId" TEXT,
    "questionSetTitle" TEXT,
    "clearedById" TEXT,
    "clearedByName" TEXT,
    "answersCleared" INTEGER NOT NULL DEFAULT 0,
    "marksWithdrawn" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "AnswerReset_studentId_idx" ON "AnswerReset"("studentId");

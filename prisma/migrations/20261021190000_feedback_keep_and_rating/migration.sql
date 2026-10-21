-- Feedback outlives the student's account: studentId becomes optional and is
-- cleared on delete, and who wrote it is kept on the row. Existing rows take
-- their name and grade from the account they belong to. Also adds the
-- optional star rating and "would you recommend Mr Tan" answer.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "studentGrade" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "wouldRecommend" BOOLEAN,
    "mayQuote" BOOLEAN NOT NULL DEFAULT false,
    "credit" TEXT,
    "creditLine" TEXT,
    "readAt" DATETIME,
    "starredAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("archivedAt", "createdAt", "credit", "creditLine", "id", "kind", "mayQuote", "message", "readAt", "starredAt", "studentId", "studentName", "studentGrade")
SELECT f."archivedAt", f."createdAt", f."credit", f."creditLine", f."id", f."kind", f."mayQuote", f."message", f."readAt", f."starredAt", f."studentId", COALESCE(u."name", ''), u."grade"
FROM "Feedback" f LEFT JOIN "User" u ON u."id" = f."studentId";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE INDEX "Feedback_studentId_createdAt_idx" ON "Feedback"("studentId", "createdAt");
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- The Feedback form's questions become rows the admin edits. The four fixed
-- questions are added as the starting set, and the old "What is it?" column
-- (kind) moves into an answer to the first of them before it is dropped.

-- CreateTable
CREATE TABLE "FeedbackQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "role" TEXT,
    "labelEn" TEXT NOT NULL,
    "labelZh" TEXT,
    "hintEn" TEXT,
    "hintZh" TEXT,
    "choices" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FeedbackAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedbackId" TEXT NOT NULL,
    "questionId" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FeedbackAnswer_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedbackAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FeedbackQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- The starting questions: the form as it was before.
INSERT INTO "FeedbackQuestion" ("id", "order", "type", "role", "labelEn", "labelZh", "choices", "required") VALUES
    ('fq_kind', 0, 'CHOICE', NULL, 'What is it?', '是哪一种？',
     '[{"en":"Idea","zh":"想法"},{"en":"Suggestion","zh":"建议"},{"en":"Feedback","zh":"反馈"}]', 1),
    ('fq_message', 1, 'LONG_TEXT', 'QUOTE', 'Your message', '你的留言', NULL, 1),
    ('fq_rating', 2, 'STARS', 'RATING', 'Rate Mr Tan', '给老师评分', NULL, 0),
    ('fq_recommend', 3, 'YES_NO', 'RECOMMEND', 'Will you recommend Mr Tan to your friends?', '你会把 Mr Tan 推荐给朋友吗？', NULL, 0);

-- Existing messages keep their answer to "What is it?".
INSERT INTO "FeedbackAnswer" ("id", "feedbackId", "questionId", "label", "value", "order")
SELECT 'fa_kind_' || "id", "id", 'fq_kind', 'What is it?',
       CASE "kind" WHEN 'IDEA' THEN 'Idea' WHEN 'SUGGESTION' THEN 'Suggestion' ELSE 'Feedback' END, 0
FROM "Feedback";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "studentGrade" TEXT,
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
INSERT INTO "new_Feedback" ("archivedAt", "createdAt", "credit", "creditLine", "id", "mayQuote", "message", "rating", "readAt", "starredAt", "studentGrade", "studentId", "studentName", "wouldRecommend") SELECT "archivedAt", "createdAt", "credit", "creditLine", "id", "mayQuote", "message", "rating", "readAt", "starredAt", "studentGrade", "studentId", "studentName", "wouldRecommend" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE INDEX "Feedback_studentId_createdAt_idx" ON "Feedback"("studentId", "createdAt");
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackQuestion_role_key" ON "FeedbackQuestion"("role");

-- CreateIndex
CREATE INDEX "FeedbackAnswer_feedbackId_idx" ON "FeedbackAnswer"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackAnswer_questionId_value_idx" ON "FeedbackAnswer"("questionId", "value");

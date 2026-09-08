-- Drop the unused Question.title column (question content lives in `body`).
ALTER TABLE "Question" DROP COLUMN "title";

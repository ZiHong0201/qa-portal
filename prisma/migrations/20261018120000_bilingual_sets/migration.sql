-- AlterTable: the language a student reads bilingual sets in (null = both)
ALTER TABLE "User" ADD COLUMN "questionLanguage" TEXT;

-- AlterTable: a set written Malay first, then English
ALTER TABLE "QuestionSet" ADD COLUMN "bilingual" BOOLEAN NOT NULL DEFAULT false;

-- The Science papers are printed Malay then English throughout.
UPDATE "QuestionSet" SET "bilingual" = true WHERE "subject" = 'Science';

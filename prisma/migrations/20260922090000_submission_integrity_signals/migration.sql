-- AlterTable: integrity signals recorded alongside each answer
ALTER TABLE "Submission" ADD COLUMN "secondsTaken" INTEGER;
ALTER TABLE "Submission" ADD COLUMN "awayCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Submission" ADD COLUMN "awaySeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Submission" ADD COLUMN "pasteAttempts" INTEGER NOT NULL DEFAULT 0;

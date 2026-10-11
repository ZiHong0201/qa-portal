-- CreateTable
CREATE TABLE "LiveQuiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionSetId" TEXT,
    "questionIds" TEXT NOT NULL,
    "secondsPerQuestion" INTEGER NOT NULL DEFAULT 20,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentIndex" INTEGER NOT NULL DEFAULT -1,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "LiveParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveParticipant_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LiveQuiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiveAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "choiceId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveAnswer_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LiveQuiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LiveAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "LiveParticipant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LiveQuiz_code_idx" ON "LiveQuiz"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_tokenHash_key" ON "LiveParticipant"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "LiveParticipant_quizId_nameKey_key" ON "LiveParticipant"("quizId", "nameKey");

-- CreateIndex
CREATE INDEX "LiveAnswer_quizId_questionIndex_idx" ON "LiveAnswer"("quizId", "questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LiveAnswer_participantId_questionIndex_key" ON "LiveAnswer"("participantId", "questionIndex");


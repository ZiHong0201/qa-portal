-- CreateTable
CREATE TABLE "StudentSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentSubject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubject_studentId_subject_key" ON "StudentSubject"("studentId", "subject");

-- Backfill: carry each student's existing single subject into the new table
-- before the column is dropped below.
INSERT INTO "StudentSubject" ("id", "studentId", "subject", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "subject", CURRENT_TIMESTAMP
FROM "User"
WHERE "subject" IS NOT NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "grade" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("id", "name", "email", "passwordHash", "role", "grade", "createdAt") SELECT "id", "name", "email", "passwordHash", "role", "grade", "createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_GRADES = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"];

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin1234";
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  console.log(`Created admin account: ${email} / ${password}`);
  console.log("Change this password after first login is available, or create a new admin and remove this one.");
}

async function seedGrades() {
  for (const [i, name] of DEFAULT_GRADES.entries()) {
    await prisma.grade.upsert({
      where: { name },
      update: {},
      create: { name, order: i },
    });
  }
}

// Backfills the Subject master list from any subject names already in use
// on question sets/students, so switching to admin-managed master data
// doesn't orphan existing data.
async function seedSubjectsFromExistingData() {
  const [sets, studentSubjects] = await Promise.all([
    prisma.questionSet.findMany({ distinct: ["subject"], select: { subject: true } }),
    prisma.studentSubject.findMany({ distinct: ["subject"], select: { subject: true } }),
  ]);

  const names = new Set<string>();
  for (const s of sets) names.add(s.subject);
  for (const s of studentSubjects) names.add(s.subject);

  for (const name of names) {
    await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function main() {
  await seedAdmin();
  await seedGrades();
  await seedSubjectsFromExistingData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

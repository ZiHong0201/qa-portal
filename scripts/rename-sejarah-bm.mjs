// Renames the Sejarah question sets from the English chapter titles the source
// documents used to the official KSSM Bahasa Malaysia chapter titles, since the
// questions themselves are in Malay and that is how the syllabus names them.
//
// The titles live in scripts/sejarah-bm-titles.mjs, shared with the importer.
//
// Note this only touches QuestionSet.title and .description. The grade stays
// "Form 4" / "Form 5" because that value is shared with every other subject
// and with the Grade master data.
//
// Usage: node scripts/rename-sejarah-bm.mjs [--dry-run]
import "dotenv/config";
import { createClient } from "@libsql/client";
import { SEJARAH_BM_TITLES, TINGKATAN } from "./sejarah-bm-titles.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});



async function main() {
  const sets = await db.execute(`
    SELECT s.id, s.title, s.description,
           (SELECT g.grade FROM QuestionSetGrade g WHERE g.questionSetId = s.id LIMIT 1) AS grade
    FROM QuestionSet s
    WHERE s.subject = 'Sejarah'
    ORDER BY grade, s.createdAt`);

  if (sets.rows.length === 0) {
    console.log("No Sejarah sets found.");
    return;
  }

  const problems = [];
  const plan = [];

  let alreadyRenamed = 0;

  for (const row of sets.rows) {
    // Already renamed by an earlier run - leave it alone rather than treating
    // it as a failure, so re-running the script is harmless.
    if (/^Bab \d+: /.test(String(row.title))) {
      alreadyRenamed++;
      continue;
    }
    const chapterM = String(row.title).match(/^Chapter (\d+):/);
    if (!chapterM) {
      problems.push(`${row.title} - title is neither "Chapter N: ..." nor "Bab N: ..."`);
      continue;
    }
    const chapterNo = Number(chapterM[1]);
    const bm = SEJARAH_BM_TITLES[row.grade]?.[chapterNo];
    if (!bm) {
      problems.push(`${row.title} - no BM title for ${row.grade} chapter ${chapterNo}`);
      continue;
    }
    plan.push({
      id: row.id,
      grade: row.grade,
      from: row.title,
      to: `Bab ${chapterNo}: ${bm}`,
      description: `Soalan Kertas 1 SPM Sejarah 2026 (kertas percubaan negeri) bagi ${TINGKATAN[row.grade]} Bab ${chapterNo}: ${bm}.`,
    });
  }

  // Refuse to rename a partial set - a mismatch means the mapping is wrong.
  if (problems.length) {
    console.log("Could not map every set, so nothing was changed:");
    problems.forEach((p) => console.log("  " + p));
    process.exitCode = 1;
    return;
  }
  if (alreadyRenamed === sets.rows.length) {
    console.log(`All ${alreadyRenamed} Sejarah sets already use their BM titles. Nothing to do.`);
    return;
  }
  if (plan.length + alreadyRenamed !== 20) {
    console.log(
      `Expected 20 Sejarah sets, found ${plan.length} to rename plus ${alreadyRenamed} already done. Nothing changed.`
    );
    process.exitCode = 1;
    return;
  }

  for (const p of plan) {
    console.log(`${p.grade}  ${p.from}\n       -> ${p.to}`);
  }

  if (DRY_RUN) {
    console.log("\n--- dry run, nothing written ---");
    return;
  }

  for (const p of plan) {
    await db.execute({
      sql: `UPDATE QuestionSet SET title = ?, description = ?, updatedAt = ? WHERE id = ?`,
      args: [p.to, p.description, new Date().toISOString(), p.id],
    });
  }
  console.log(`\nRenamed ${plan.length} Sejarah sets to their official BM titles.`);
}

main();

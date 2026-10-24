# Q&A Credit Portal

Students log in and answer question sets (scoped to their grade + subject) to
earn marks/points. Points can be spent in a gift catalogue. Staff come in two
roles: **teachers** build the sets and questions (in the subjects an admin
assigns them), grade, and manage students; **admins** can do all of that and
also run the portal itself - the catalogue, announcements, master data
(grades, subjects), staff accounts, feedback, the reset and fee receipts.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + **Turso** (hosted libSQL — see [Database](#database) below)
- NextAuth (Credentials provider, email/password)
- Images (question diagrams, catalogue items) stored in **Vercel Blob**
  (see [Image uploads](#image-uploads) below)
- Exam paper import (PDF/Word → questions) via the Anthropic API

## Getting started

```bash
npm install
# .env needs TURSO_DATABASE_URL + TURSO_AUTH_TOKEN for a Turso database
# (see Database below) - already set up for this project.
node scripts/migrate-turso.mjs   # applies the schema to Turso (idempotent, safe to re-run)
npm run db:seed                   # creates an admin account + default grades
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To work without touching the hosted database, point the same variables at a
local file instead - libSQL reads SQLite files directly, and the migration
script only needs the token to be non-empty:

```bash
export TURSO_DATABASE_URL=file:./local.db TURSO_AUTH_TOKEN=local
node scripts/migrate-turso.mjs && npm run db:seed && npm run dev
```

The seed script creates an admin account:

- Email: `admin@example.com`
- Password: `admin1234`

Override these with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and
`SEED_ADMIN_NAME` env vars before running `npm run db:seed`. Change the
password (or create a new admin and remove this one) before using this in a
real classroom.

Students either get an account from staff (`/admin/students/new`) or ask for
one at `/request-account`; staff approve the request at
`/admin/students/requests` and the generated password is emailed to the
student. Teacher and admin accounts are created by an admin at `/admin/staff`.

## Database

The app runs on **Turso** (hosted libSQL, SQLite-compatible), not a local
file — see `.env` for `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`. This was
chosen so the app can be hosted somewhere always-on (e.g. Vercel's free
tier) without needing a local SQLite file, which wouldn't survive
serverless/ephemeral filesystems.

**Prisma's own migration engine can't talk to `libsql://` URLs directly**
(no CLI/WSL available in this environment to work around it), so schema
changes are applied to Turso with a small custom script instead of
`prisma migrate deploy`:

```bash
npm run db:migrate        # generates a new migration locally (uses local dev.db)
node scripts/migrate-turso.mjs   # applies any new migrations to Turso
```

`scripts/migrate-turso.mjs` reads `prisma/migrations/*/migration.sql` in
order and applies whatever hasn't been applied yet (tracked in a
`_prisma_migrations` table on Turso, same format Prisma itself uses), so
it's safe to run repeatedly.

## How it works

- **Grades and subjects** are admin-managed master data (`/admin/master-data`),
  not hardcoded — e.g. "Form 1"–"Form 5" and whatever subjects the school
  teaches. Every question set and student account is tagged with one grade +
  one subject; students only see sets matching both.
- **Admins** create question sets at `/admin/sets`, then add questions to
  each set at `/admin/sets/[id]/questions/new` (or import a whole exam paper
  at `/admin/sets/[id]/import` — PDF/Word, extracted via Claude). Every
  question has a body, optional diagram, 2–6 options with one marked
  correct, an optional explanation (shown to students who answer wrong,
  along with the correct answer), and a marks value.
- **Students** see their grade+subject's question sets on `/dashboard`,
  answer every question on one page (auto-graded instantly), and see a
  "marks obtained" summary once a set is complete.
- **Points/catalogue**: a student's spendable balance = marks earned from
  quizzes + admin adjustments − catalogue redemptions (computed live from
  the underlying records, not a mutable counter). Admins manage catalogue
  items at `/admin/catalogue` and can credit/deduct a student's points
  directly at `/admin/students/[id]`. Students redeem items at
  `/dashboard/catalogue`.
- A question/set/catalogue item that already has submissions/redemptions
  can't be edited or deleted (would corrupt grading/spend history) —
  deactivate it and create a new one instead.
- Free-response questions and the manual-review flow at `/admin/review`
  still exist in the schema/backend for future use, but the current
  authoring UI (including exam import) only creates multiple-choice
  questions.

## Useful scripts

```bash
npm run db:migrate               # generate a new migration (targets local dev.db, not Turso)
npm run db:studio                # browse/edit the LOCAL dev.db in Prisma Studio (not Turso)
node scripts/migrate-turso.mjs   # apply pending migrations to Turso
npm run lint
npm run build
```

To browse/edit the live Turso data itself (not local dev.db), use the Turso
web dashboard at [app.turso.tech](https://app.turso.tech) — Prisma Studio
can't target a `libsql://` datasource, same limitation as migrations.

## Image uploads

Question diagrams and catalogue item images are stored in **Vercel Blob**
(`@vercel/blob`), not on local disk — needed because Vercel's filesystem is
ephemeral/read-only in production. `BLOB_READ_WRITE_TOKEN` is auto-provided
by Vercel when a Blob store is linked to the project; no manual env var
setup is needed there. For local dev, pull it with `vercel env pull` (or
copy it from the Vercel dashboard's Storage tab into `.env`) if you want to
test uploads locally — image upload features will error without it.

## Project layout

- `prisma/schema.prisma` — data model
- `scripts/migrate-turso.mjs` — applies migrations to Turso (see Database above)
- `src/auth.ts` — NextAuth config (Credentials provider, JWT sessions; the
  account's role is re-read at most a minute after it changes, so revoking
  or deleting staff takes effect without them logging out)
- `src/proxy.ts` — route protection (`/dashboard/*` requires login,
  `/admin/*` requires a staff role, admin-only sections and `/payment`
  require ADMIN)
- `src/lib/permissions.ts` — who may do what; every server action starts
  with one of its guards
- `src/lib/actions/` — server actions (auth, question sets, questions,
  submissions, students, master data, catalogue, point adjustments)
- `src/lib/uploads.ts` — image file storage (questions + catalogue items)
- `src/lib/points.ts` — student points-balance calculation
- `src/app/dashboard/` — student-facing pages
- `src/app/admin/` — admin-facing pages

## Environment variables

| Variable | Needed for | Without it |
| --- | --- | --- |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Everything (the database) | The app cannot start |
| `AUTH_SECRET` | Signing login sessions | Logins fail |
| `CRON_SECRET` | The daily jobs in `vercel.json` (integrity clean-up, scheduled reset) | Both jobs refuse to run (503) |
| `BLOB_READ_WRITE_TOKEN` | Image uploads (diagrams, gifts, pop-ups) | Uploads error; set by Vercel when a Blob store is linked |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Password-reset emails, approved-account emails, receipts | Those emails are not sent |
| `ANTHROPIC_API_KEY` | Exam paper import | Import is disabled; everything else works |
| `PORTAL_ORIGIN` | Links in emails, redirects from the payment site | Defaults to the hosted portal's address |
| `RECEIPT_COPY_TO` | The blind copy of every receipt | Defaults to the owner's address in `src/lib/mailer.ts` |

## Notes for production use

- Set a real `AUTH_SECRET` for production (a fresh one is generated in
  `.env` locally — don't reuse it in production).
- Add rate limiting to `/login`.

# Lesson Archiver

Watches your Zoom cloud recordings, works out which lesson each one is, files
it into the right Google Drive folder, and tells you what it did.

Runs entirely on your own Mac. It adds no new subscriptions: Zoom Workplace
Pro, Google Drive and Claude are the only suppliers, and Apple Calendar does
the heavy lifting on identification.

---

## How it decides what a recording is

The naive approach is to have a model watch the video and guess the subject.
That is the expensive part of the problem and the part that gets things wrong.

Your calendar already answers it. If the schedule says *"Physics F5 — Ch3
Electricity, 16:00–17:30"*, then subject, form, chapter and the expected time
window are declared before the lesson happens, and matching a recording to
that slot is a deterministic time join, not an inference. Claude's job shrinks
to **verifying** the transcript against what was scheduled — an easier task
with a much lower cost of error, because a disagreement between the two
sources is itself the useful signal.

Three consequences follow, and they shape everything else:

- **The classifier becomes cheap.** Roughly 4,000 tokens per lesson, about
  $1/month, and losing it entirely just degrades to calendar-only filing
  rather than stopping the pipeline.
- **A recording with no lesson behind it is probably not a lesson.** Staff
  meetings and parent calls never have their video downloaded at all, which is
  the single largest storage saving available.
- **Silent failure becomes visible.** Every other fault here looks identical
  to a quiet day. Comparing the schedule against what was archived each night
  is what surfaces the difference.

```
 Calendar ──► poll Zoom ──► audio-only (40 MB) + Zoom VTT
                                     │
                     match to calendar event (time overlap)
                                     │
                       Claude: does the transcript agree?
                                     │
              ┌──────────────────────┼──────────────────────┐
         agrees                  disagrees             no lesson found
              │                      │                       │
        download video          _Review                video never
        → subject folder                               downloaded
              └──────────────────────┴───────────────────────┘
                                     ▼
              upload → VERIFY byte count → then clear Zoom
                                     ▼
                            Telegram message
```

Audio is fetched before video deliberately. Zoom publishes an audio-only M4A
(~27 MB/hour) alongside the video (~700 MB/hour); classification needs speech,
not pixels. Deciding first and downloading second cuts transfer for rejected
recordings by about 96%.

---

## Setup

Six steps. Five of them need you, because they involve credentials.

### 1. Install

```bash
cd lesson-archiver
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp config.example.yaml config.yaml
cp .env.example .env
```

Optional, and only needed if Zoom's own transcripts turn out poor on your
mixed-language lessons:

```bash
pip install faster-whisper
```

### 2. Zoom

**In Zoom settings** (web portal → Settings → Recording), turn on:

- Cloud recording
- **Record an audio only file** — this is what keeps the pipeline cheap
- **Create audio transcript** — this is what keeps it free
- Recording quality 720p, and turn *off* gallery-view and per-participant
  audio files. One video per session roughly halves your storage.

**Create the API app** at [marketplace.zoom.us](https://marketplace.zoom.us) →
Develop → Build App → **Server-to-Server OAuth**. Add scopes for reading
recordings, deleting recordings, and reading your user profile (search the
scope picker for `recording` and tick the read and delete entries). Activate
the app, then copy Account ID, Client ID and Client Secret into `.env`.

### 3. Apple Calendar

Make a **dedicated "Teaching" calendar** in Calendar.app and put your lessons
in it. A separate calendar means a leaked credential never exposes your
personal schedule, and the parser never has to filter your dentist
appointments.

Title your events so the parser can read them. All of these work:

```
Physics F5 - Ch3 Electricity
Physics Form 5 — Chapter 3
Fizik Tingkatan 5 - Bab 3
```

Then generate an **app-specific password** at
[appleid.apple.com](https://appleid.apple.com) (Sign-In and Security →
App-Specific Passwords; needs two-factor enabled). Put your Apple ID and that
password in `.env` as `ICLOUD_USERNAME` / `ICLOUD_APP_PASSWORD`. It is
revocable on its own, without touching your real password.

Check it reads correctly before trusting it:

```bash
python -m archiver.cli calendar --days 14
```

That prints each event with how its title parsed. If `subject`, `form` or
`chapter` come out as `None`, adjust the title convention or the `syllabus`
block in `config.yaml`.

### 4. Google Drive

A service account will **not** work here — service accounts have no My Drive
storage quota, and you get an opaque error rather than a useful one. Use an
installed-app OAuth client instead:

1. [Google Cloud Console](https://console.cloud.google.com) → new project
2. APIs & Services → Library → enable **Google Drive API**
3. Credentials → Create Credentials → **OAuth client ID** → **Desktop app**
4. Download the JSON to `credentials/google-oauth-client.json`

```bash
python -m archiver.cli auth-drive
```

The default scope is `drive.file`, so the archiver can only touch files it
creates itself — it cannot read the rest of your Drive. If you want it to file
into an existing folder instead, set `drive.root_folder_id` **and** change
`drive.oauth_scope` to `drive`.

### 5. Telegram (optional but recommended)

Message [@BotFather](https://t.me/botfather) → `/newbot` → copy the token.
Send your new bot any message, then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` and read your chat id. Both
go in `.env`. Set `notify.backend: macos` instead if you would rather have
local banners, or `none` for logs only.

### 6. Claude

The default costs nothing: `classify.backend` is `claude-code`, which shells
out to the Claude Code CLI under your own login, so your existing subscription
covers it and there is no API bill and no key to manage.

| Backend | Cost | Requires |
|---|---|---|
| `claude-code` *(default)* | **$0** — your Claude subscription | `claude` on PATH, logged in as the user this runs as |
| `api` | ~$0.60–2.00/month | `ANTHROPIC_API_KEY` in `.env` |

Install it and sign in:

```bash
curl -fsSL https://claude.ai/install.sh | bash   # or: brew install --cask claude-code
claude                                            # log in via the browser prompt
claude --version                                  # should print a version
```

Claude Code needs a Pro, Max, Team or Enterprise plan — the free claude.ai
tier does not include it.

Two things to get right, both of which fail silently rather than loudly:

- Sign in as the **same macOS user** the launchd job runs as. Credentials are
  per-user, so a job running as someone else finds no login.
- Leave `ANTHROPIC_API_KEY` blank in `.env`. If it is set at all, the CLI
  authenticates as an API caller instead of using your subscription. The
  loader skips blank values for exactly this reason, and the backend strips
  the variable from the CLI's environment.

The CLI installs to `~/.local/bin/claude`, which is **not** on the minimal
PATH launchd gives scheduled jobs. `run.sh` adds it, and the classifier also
checks the Homebrew locations; set `CLAUDE_BINARY` in `.env` to override.

The `api` backend only becomes necessary if you ever move this off your own
Mac, where nobody is logged in to a CLI. Usage is negligible either way:
roughly 4,000 tokens per lesson, about 20 lessons a month.

---

## Check it, then run it

```bash
python -m archiver.cli doctor       # every credential and setting, no side effects
python -m archiver.cli run --dry-run  # decide and report, download and delete nothing
python -m archiver.cli run          # for real
```

`--dry-run` is worth doing on a few real recordings before you let it delete
anything from Zoom. It prints the routing decision for each one and leaves the
state untouched, so a real run afterwards still picks them up.

### Scheduling

```bash
# edit the CHANGE_ME paths inside both plists first
cp launchd/*.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.lessonarchiver.poll.plist
launchctl load ~/Library/LaunchAgents/com.lessonarchiver.maintenance.plist
```

Polling runs every 15 minutes and exits in seconds when there is nothing new.
`RunAtLoad` means a closed laptop catches up on its backlog as soon as it
wakes. Reconciliation runs nightly at 22:00 and messages you only when a
scheduled lesson has no archive, or a recording is stuck.

---

## Commands

| Command | What it does |
|---|---|
| `doctor` | Checks config, credentials, Zoom auth, calendar access and Drive authorisation |
| `calendar --days 14` | Prints events and how each title parsed — use before trusting the convention |
| `run [--dry-run]` | Polls Zoom and archives new recordings |
| `reconcile [--days N]` | Compares scheduled lessons against archived ones, alerts on gaps |
| `sweep [--dry-run]` | Retention tiering: drops video past the cutoff, keeps audio and transcript |
| `auth-drive` | One-time Google consent flow |

---

## Where things end up

```
Teaching Archive/
├── Physics/
│   └── Form 5/2026/Ch03 - Electricity and Magnetism/
│       ├── PHY-F5_Ch03_2026-09-17_1600.mp4
│       ├── PHY-F5_Ch03_2026-09-17_1600.m4a
│       └── PHY-F5_Ch03_2026-09-17_1600.vtt
├── _Review/2026-09/        ← ambiguous or disagreeing; needs a glance
└── _Unsorted/2026-09/      ← audio + transcript only, no video
```

Names come from the decision rather than the Zoom meeting topic, so re-running
after a partial failure overwrites instead of duplicating.

---

## Decision rules

| Calendar | Transcript | Result |
|---|---|---|
| Physics F5, one match | Agrees | Filed automatically |
| Physics F5, one match | Same subject, different chapter | Filed under the chapter **taught**, divergence reported |
| Physics F5, one match | Different subject | `_Review` |
| Two back-to-back lessons overlap | — | `_Review` (never guesses between them) |
| One match | Classifier unavailable | Filed on calendar evidence alone |
| Another subject | Agrees | Filed under that subject too |
| No event | Confident lesson | Filed, flagged as unscheduled |
| No event | Not a lesson | **Video never downloaded**; audio kept 30 days |

You asked specifically for Physics Form 5, and `watch` in `config.yaml` is set
to exactly that — it controls which lessons reconciliation expects. But because
the calendar drives routing, other subjects file correctly at no extra cost;
add them to `syllabus` if you want tidy chapter folders for them too.

---

## Storage

400 GB, about 20 lessons a month at 90 minutes, Zoom 720p at ~0.7 GB/hour:

| Policy | Growth | Runway |
|---|---|---|
| Archive everything forever | ~21 GB/mo | ~14 months |
| Calendar-gated (non-lessons skipped) | ~17 GB/mo | ~17 months |
| **Gated + tiered** (`sweep`, video 12 months) | plateaus | **indefinite**, settling near 215 GB |

Zoom's own 10 GB allowance is about two weeks of teaching, so the pipeline
clearing it after each archive is what keeps you inside it. If archiving
stalls, Zoom fills up and **stops recording** — which is why `run` warns at
60% and `reconcile` chases anything stuck.

Deletion uses Zoom's **trash** by default, recoverable for 30 days.

---

## Cost

| Item | Monthly |
|---|---|
| Zoom Workplace Pro | $0 incremental (already subscribed) |
| Google Drive 400 GB | $0 incremental (already subscribed) |
| Compute | $0 (your Mac) |
| Transcription | $0 (Zoom VTT, local Whisper fallback) |
| Claude | $0 (`claude-code`, your existing subscription) |
| Telegram | $0 |
| **Total** | **$0.00** |

---

## Safety properties

The ordering of the last three stages is the important part, and there are
tests pinning each one:

1. **Verify before delete.** Nothing leaves Zoom until the Drive copy matches
   byte for byte. A failed verification raises and keeps the Zoom original.
2. **Idempotent.** Keyed on the Zoom recording UUID, so re-polling the same
   recording — which happens on every cycle until it is cleared — never
   archives it twice.
3. **Resumable.** Stages are recorded in SQLite; a crash mid-upload resumes at
   the last completed stage rather than re-downloading a gigabyte.
4. **Degrades rather than stalls.** No calendar, no transcript, or no
   classifier each reduce confidence and change routing — none of them stop
   lessons being archived.

```bash
python -m pytest tests/ -q     # 46 tests, no credentials needed
```

---

## Privacy

These recordings contain minors. Two things worth doing regardless of this
tool: keep the Drive folder unshared by default, and make sure parents have
consented to lessons being recorded and retained — Malaysia's PDPA 2010
applies to the personal data in them. The `drive.file` scope, the dedicated
Teaching calendar and the revocable app-specific password all exist to keep
the blast radius of a leaked credential small.

// Load test for a live quiz: N simulated players join a game, poll it the way
// a phone does, and answer every question - then the final standings are
// checked against what each player actually did.
//
// The host is not simulated. Run this, then drive the game from the host
// screen as you would in a hall: Start, then Next after each reveal. The
// script waits for the game to finish and prints a report.
//
// It only uses the public endpoints, exactly as a phone does, so it works
// against the local dev server or the deployed site.
//
// Usage:
//   node scripts/live-load-test.mjs <code> [players=100] [baseUrl=http://localhost:3000]

const [code, playersArg = "100", base = "http://localhost:3000"] = process.argv.slice(2);
if (!/^\d{6}$/.test(code ?? "")) {
  console.error("Usage: node scripts/live-load-test.mjs <code> [players] [baseUrl]");
  process.exit(1);
}
const PLAYERS = Number(playersArg);
const POLL_MS = 2000;

const stats = { poll: [], join: [], answer: [] };
const errors = { poll: 0, join: 0, answer: 0, answerRefused: {} };
const cacheHits = { HIT: 0, MISS: 0, other: 0 };

async function timed(kind, fn) {
  const t = performance.now();
  try {
    return await fn();
  } finally {
    stats[kind].push(performance.now() - t);
  }
}

function pct(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Bot {
  constructor(i) {
    this.name = `Bot ${String(i).padStart(3, "0")}`;
    this.answers = {}; // index -> { choiceId, ok }
    this.lastState = null;
  }

  async join() {
    const res = await timed("join", () =>
      fetch(`${base}/api/live/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.name }),
      })
    );
    if (!res.ok) {
      errors.join++;
      throw new Error(`${this.name} could not join: ${res.status} ${await res.text()}`);
    }
    Object.assign(this, await res.json());
  }

  async poll() {
    try {
      const res = await timed("poll", () => fetch(`${base}/api/live/${code}`, { cache: "no-store" }));
      const hit = res.headers.get("x-vercel-cache");
      if (hit === "HIT") cacheHits.HIT++;
      else if (hit === "MISS" || hit === "STALE") cacheHits.MISS++;
      else cacheHits.other++;
      if (!res.ok) {
        errors.poll++;
        return null;
      }
      return await res.json();
    } catch {
      errors.poll++;
      return null;
    }
  }

  async answer(state) {
    const i = state.index;
    if (this.answers[i] || !state.question) return;
    const choices = state.question.choices;
    const choice = choices[Math.floor(Math.random() * choices.length)];
    this.answers[i] = { choiceId: choice.id, ok: null };

    // Think for a while, like a person: anywhere in the first 80% of the clock.
    const window = Math.max(0, state.endsAt - state.serverNow);
    await sleep(Math.random() * window * 0.8);

    const res = await timed("answer", () =>
      fetch(`${base}/api/live/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: this.token, index: i, choiceId: choice.id }),
      })
    ).catch(() => null);
    if (res?.ok) {
      this.answers[i].ok = true;
    } else {
      this.answers[i].ok = false;
      errors.answer++;
      const why = res ? (await res.json().catch(() => ({}))).error ?? res.status : "network";
      errors.answerRefused[why] = (errors.answerRefused[why] ?? 0) + 1;
    }
  }

  async run() {
    // Stagger the first poll so a hundred bots are not perfectly in step -
    // real phones join over a minute, not in the same millisecond.
    await sleep(Math.random() * POLL_MS);
    for (;;) {
      const s = await this.poll();
      if (s) {
        this.lastState = s;
        if (s.phase === "QUESTION") void this.answer(s);
        if (s.phase === "FINISHED") return;
      }
      await sleep(POLL_MS);
    }
  }
}

console.log(`Joining ${PLAYERS} bots to ${code} at ${base} ...`);
const bots = Array.from({ length: PLAYERS }, (_, i) => new Bot(i + 1));

// Join in waves of 20, the way a room scans a QR code: in a burst.
for (let i = 0; i < bots.length; i += 20) {
  await Promise.all(bots.slice(i, i + 20).map((b) => b.join()));
}
console.log(`All ${PLAYERS} joined (join p50 ${pct(stats.join, 50)}ms, p95 ${pct(stats.join, 95)}ms).`);
console.log("Now drive the game from the host screen. Waiting for it to finish...\n");

// Track the reveals as they pass, to check each player's points afterwards.
const reveals = {};
const watcher = (async () => {
  for (;;) {
    const s = await bots[0].poll();
    if (s?.phase === "REVEAL" && !reveals[s.index]) {
      reveals[s.index] = { correct: s.reveal.correctChoiceId, gained: Object.fromEntries(s.standings.map((p) => [p.id, p.gained])) };
      console.log(`  Q${s.index + 1} revealed: ${s.answered} answered`);
    }
    if (s?.phase === "QUESTION") process.stdout.write(`\r  Q${s.index + 1} open: ${s.answered}/${s.players} answered   `);
    if (s?.phase === "FINISHED") return s;
    await sleep(1000);
  }
})();

await Promise.all(bots.map((b) => b.run()));
const final = await watcher;

// ---- checks ---------------------------------------------------------------
const byId = new Map(final.standings.map((p) => [p.id, p]));
let scoreMismatches = 0;
let gainedMismatches = 0;
let missing = 0;

for (const b of bots) {
  const row = byId.get(b.participantId);
  if (!row) {
    missing++;
    continue;
  }
  let expectedMin = 0;
  let expectedMax = 0;
  for (const [i, a] of Object.entries(b.answers)) {
    if (!a.ok) continue;
    const rv = reveals[i];
    if (!rv) continue;
    const right = a.choiceId === rv.correct;
    const g = rv.gained[b.participantId] ?? 0;
    // Wrong answers score nothing; right ones score 500-1000.
    if (right ? g < 500 || g > 1000 : g !== 0) gainedMismatches++;
    if (right) {
      expectedMin += 500;
      expectedMax += 1000;
    }
  }
  if (row.score < expectedMin || row.score > expectedMax) scoreMismatches++;
}

const names = final.standings.map((p) => p.name.toLowerCase());
const answeredOk = bots.reduce((n, b) => n + Object.values(b.answers).filter((a) => a.ok).length, 0);

console.log(`\n\n===== ${PLAYERS} players, ${final.total} questions =====`);
console.log(`Polls:   ${stats.poll.length}, errors ${errors.poll}, p50 ${pct(stats.poll, 50)}ms, p95 ${pct(stats.poll, 95)}ms, max ${pct(stats.poll, 100)}ms`);
console.log(`Answers: ${answeredOk} accepted, ${errors.answer} refused, p50 ${pct(stats.answer, 50)}ms, p95 ${pct(stats.answer, 95)}ms`);
if (errors.answer) console.log(`         refused because: ${JSON.stringify(errors.answerRefused)}`);
console.log(`CDN:     ${cacheHits.HIT} hits, ${cacheHits.MISS} misses, ${cacheHits.other} uncached (local dev has no CDN)`);
console.log(`Checks:  ${missing} bots missing from standings`);
console.log(`         ${gainedMismatches} per-question scores out of range (wrong>0, or right outside 500-1000)`);
console.log(`         ${scoreMismatches} totals outside what their answers allow`);
console.log(`         ${names.length - new Set(names).size} duplicate names`);
console.log(`Top 3:   ${final.standings.slice(0, 3).map((p) => `${p.name} ${p.score}`).join(", ")}`);
process.exit(missing || gainedMismatches || scoreMismatches ? 1 : 0);

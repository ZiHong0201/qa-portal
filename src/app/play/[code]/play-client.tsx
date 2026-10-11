"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CHOICE_STYLES,
  NAME_MAX_LENGTH,
  PLAYER_POLL_MS,
  type LiveState,
} from "@/lib/live";
import { rankIn, secondsUntil, useLiveState, useServerNow } from "@/lib/use-live-state";

/**
 * A player's phone. No account: the name typed here and a token handed back
 * by the server are kept in this browser, so a refresh or a dropped
 * connection puts the player straight back where they were.
 */

type Identity = {
  quizId: string;
  participantId: string;
  token: string;
  name: string;
  /** Server time of joining, to ignore lobby lists older than the join. */
  joinedAt: number;
};

// Storage is best-effort: private browsing can refuse it, and the game still
// has to work for that tab - it just will not survive a refresh.
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* see read() */
  }
}

const noopSubscribe = () => () => {};

export function PlayClient({ code }: { code: string }) {
  const { state, missing, offset } = useLiveState(code, PLAYER_POLL_MS);
  const now = useServerNow(offset);

  // Nothing from localStorage is rendered until hydration is over, so the
  // server's HTML and the first client render match.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const idKey = `live:${code}`;
  const [identity, setIdentity] = useState<Identity | null>(() =>
    typeof window === "undefined" ? null : read<Identity>(idKey)
  );
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    typeof window === "undefined" ? {} : (read<Record<number, string>>(`${idKey}:answers`) ?? {})
  );
  const [kicked, setKicked] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  if (!hydrated || (!state && !missing)) return <Screen tone="sky"><Spinner /></Screen>;

  if (missing || !state) {
    return (
      <Screen tone="slate">
        <Card>
          <h1 className="text-xl font-bold text-gray-900">No quiz with code {code}</h1>
          <p className="mt-2 text-sm text-gray-500">Check the code on the screen and try again.</p>
          <Link href="/play" className="mt-4 inline-block font-medium text-sky-700 underline">
            Enter a different code
          </Link>
        </Card>
      </Screen>
    );
  }

  // A stored identity for an older game that used the same code is not ours.
  const me = identity && identity.quizId === state.quizId ? identity : null;

  // Removed by the host: the lobby or the standings stop listing us. The
  // lobby check waits until the state is newer than our join, because the
  // CDN can hand back a copy from the second before we arrived.
  const listed = state.lobby ?? state.standings;
  const removed =
    !!me &&
    (kicked || (!!listed && state.serverNow > me.joinedAt + 1000 && !listed.some((p) => p.id === me.participantId)));

  const forget = () => {
    write(idKey, null);
    write(`${idKey}:answers`, null);
    setIdentity(null);
    setAnswers({});
    setKicked(false);
  };

  if (removed) {
    return (
      <Screen tone="slate">
        <Card>
          <h1 className="text-xl font-bold text-gray-900">You have been removed</h1>
          <p className="mt-2 text-sm text-gray-500">The host took you out of this game.</p>
          {state.phase !== "FINISHED" && (
            <button onClick={forget} className="mt-4 font-medium text-sky-700 underline">
              Join with a different name
            </button>
          )}
        </Card>
      </Screen>
    );
  }

  if (!me) {
    if (state.phase === "FINISHED") {
      return (
        <Screen tone="slate">
          <Card>
            <h1 className="text-xl font-bold text-gray-900">This quiz has finished</h1>
            <p className="mt-2 text-sm text-gray-500">{state.title}</p>
          </Card>
        </Screen>
      );
    }
    return (
      <JoinForm
        code={code}
        state={state}
        onJoined={(id) => {
          const full = { ...id, joinedAt: Date.now() + offset };
          write(idKey, full);
          write(`${idKey}:answers`, {});
          setIdentity(full);
          setAnswers({});
        }}
      />
    );
  }

  const submit = async (index: number, choiceId: string) => {
    setAnswerError(null);
    const next = { ...answers, [index]: choiceId };
    setAnswers(next);
    write(`${idKey}:answers`, next);

    const undo = () => {
      const rest = { ...next };
      delete rest[index];
      setAnswers(rest);
      write(`${idKey}:answers`, rest);
    };

    try {
      const res = await fetch(`/api/live/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: me.token, index, choiceId }),
      });
      if (res.ok) return;
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 403) setKicked(true);
      undo();
      setAnswerError(body.error ?? "That answer did not go through.");
    } catch {
      undo();
      setAnswerError("No connection - tap your answer again.");
    }
  };

  return (
    <Game
      state={state}
      now={now}
      me={me}
      chosen={answers[state.index] ?? null}
      error={answerError}
      onAnswer={submit}
    />
  );
}

function JoinForm({
  code,
  state,
  onJoined,
}: {
  code: string;
  state: LiveState;
  onJoined: (id: Omit<Identity, "joinedAt">) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Screen tone="sky">
      <Card>
        <p className="text-xs font-semibold tracking-wide text-sky-600 uppercase">Live quiz</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{state.title}</h1>
        {state.phase !== "LOBBY" && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Already started - you will join from the next question.
          </p>
        )}
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(`/api/live/${code}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) setError(body.error ?? "Could not join.");
              else onJoined(body);
            } catch {
              setError("No connection - try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            autoFocus
            autoComplete="nickname"
            placeholder="Your name"
            aria-label="Your name"
            className="w-full rounded-2xl border-2 border-sky-200 px-4 py-3 text-center text-xl text-sky-950 outline-none focus:border-sky-500"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-2xl bg-sky-600 py-3 text-lg font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-40"
          >
            {busy ? "Joining…" : "Join"}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-400">{state.players} playing</p>
      </Card>
    </Screen>
  );
}

function Game({
  state,
  now,
  me,
  chosen,
  error,
  onAnswer,
}: {
  state: LiveState;
  now: number;
  me: Identity;
  chosen: string | null;
  error: string | null;
  onAnswer: (index: number, choiceId: string) => void;
}) {
  const header = (
    <div className="mb-3 flex items-center justify-between text-sm text-white/90">
      <span className="truncate font-medium">{me.name}</span>
      {state.index >= 0 && (
        <span>
          {state.index + 1} / {state.total}
        </span>
      )}
    </div>
  );

  if (state.phase === "LOBBY") {
    return (
      <Screen tone="sky">
        {header}
        <Card>
          <div className="text-5xl">✓</div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">You&apos;re in!</h1>
          <p className="mt-1 text-gray-600">Look for your name on the screen.</p>
          <p className="mt-6 text-sm text-gray-400">
            Waiting for the host to start · {state.players} joined
          </p>
          <PulseDots />
        </Card>
      </Screen>
    );
  }

  if (state.phase === "PRE") {
    return (
      <Screen tone="indigo">
        {header}
        <Card>
          <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">
            Question {state.index + 1} of {state.total}
          </p>
          <p className="mt-3 text-6xl font-bold text-gray-900 tabular-nums">
            {secondsUntil(state.startsAt, now)}
          </p>
          <p className="mt-2 text-gray-500">Get ready…</p>
        </Card>
      </Screen>
    );
  }

  if (state.phase === "QUESTION" && state.question) {
    const total = state.secondsPerQuestion * 1000;
    const left = Math.max(0, (state.endsAt ?? now) - now);
    // The phone locks at the deadline by its corrected clock. The server takes
    // answers a moment longer, but a button that still works after the
    // countdown shows 0 would look like a bug.
    const timeUp = left <= 0;
    const locked = !!chosen || timeUp;

    return (
      <Screen tone="indigo" align="top">
        {header}
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear"
            style={{ width: `${(left / total) * 100}%` }}
          />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>{secondsUntil(state.endsAt, now)}s</span>
            <span>
              {state.answered} / {state.players} answered
            </span>
          </div>
          <p className="max-h-[45dvh] overflow-y-auto whitespace-pre-wrap text-gray-900">
            {state.question.body}
          </p>
          {state.question.diagramUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.question.diagramUrl}
              alt="Diagram for this question"
              className="mt-3 max-w-full rounded-md border border-gray-200"
            />
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {state.question.choices.map((c, i) => {
            const style = CHOICE_STYLES[i % CHOICE_STYLES.length];
            const isMine = chosen === c.id;
            return (
              <button
                key={c.id}
                disabled={locked}
                onClick={() => onAnswer(state.index, c.id)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-white shadow-md transition-all ${style.bg} ${
                  locked ? (isMine ? "ring-4 ring-white" : "opacity-35") : `${style.hover} active:scale-[0.98]`
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/25 font-bold">
                  {style.letter}
                </span>
                <span className="font-medium">{c.text}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-center text-sm text-white/90" role="status">
          {error ?? (chosen ? "Answer locked in. Waiting for the others…" : timeUp ? "Time's up!" : "")}
        </p>
      </Screen>
    );
  }

  if (state.phase === "REVEAL" && state.reveal && state.standings) {
    const correctId = state.reveal.correctChoiceId;
    const right = !!chosen && chosen === correctId;
    const mine = state.standings.find((s) => s.id === me.participantId);
    const rank = rankIn(state.standings, me.participantId);
    const correctIndex = state.question?.choices.findIndex((c) => c.id === correctId) ?? -1;
    const correctText = correctIndex >= 0 ? state.question!.choices[correctIndex].text : null;

    return (
      <Screen tone={right ? "emerald" : "rose"}>
        {header}
        <Card>
          <div className="text-5xl">{right ? "🎉" : chosen ? "✗" : "⏱"}</div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {right ? "Correct!" : chosen ? "Not this time" : "No answer"}
          </h1>
          {right && mine?.gained ? (
            <p className="mt-1 text-3xl font-bold text-emerald-600">+{mine.gained.toLocaleString()}</p>
          ) : null}
          {!right && correctText && (
            <p className="mt-2 text-sm text-gray-600">
              The answer was{" "}
              <span className="font-semibold">
                {CHOICE_STYLES[correctIndex % CHOICE_STYLES.length].letter}. {correctText}
              </span>
            </p>
          )}
          {mine && rank && (
            <p className="mt-5 rounded-xl bg-gray-50 px-3 py-2 text-gray-700">
              <span className="font-semibold">{ordinal(rank)}</span> of {state.standings.length} ·{" "}
              {mine.score.toLocaleString()} pts
            </p>
          )}
          <p className="mt-4 text-xs text-gray-400">Next question coming up…</p>
        </Card>
      </Screen>
    );
  }

  if (state.phase === "FINISHED" && state.standings) {
    const mine = state.standings.find((s) => s.id === me.participantId);
    const rank = rankIn(state.standings, me.participantId);
    return (
      <Screen tone="amber">
        {header}
        <Card>
          <p className="text-sm font-semibold tracking-wide text-amber-600 uppercase">Final results</p>
          {rank && (
            <>
              <div className="mt-2 text-5xl">{rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "⭐"}</div>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{ordinal(rank)} place</h1>
              <p className="text-gray-600">
                {mine?.score.toLocaleString()} pts · {state.standings.length} players
              </p>
            </>
          )}
          <ol className="mt-5 flex flex-col gap-1 text-left">
            {state.standings.slice(0, 3).map((s, i) => (
              <li
                key={s.id}
                className={`flex justify-between rounded-lg px-3 py-1.5 ${s.id === me.participantId ? "bg-amber-100" : "bg-gray-50"}`}
              >
                <span className="truncate">
                  {["🥇", "🥈", "🥉"][i]} {s.name}
                </span>
                <span className="font-semibold tabular-nums">{s.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-gray-400">Thanks for playing!</p>
        </Card>
      </Screen>
    );
  }

  // A question deleted mid-game, or a state between polls.
  return (
    <Screen tone="indigo">
      {header}
      <Spinner />
    </Screen>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const TONES = {
  sky: "from-sky-500 to-indigo-600",
  indigo: "from-indigo-600 to-violet-700",
  emerald: "from-emerald-500 to-teal-600",
  rose: "from-rose-500 to-orange-500",
  amber: "from-amber-400 to-orange-500",
  slate: "from-slate-600 to-slate-800",
} as const;

function Screen({
  tone,
  align = "center",
  children,
}: {
  tone: keyof typeof TONES;
  align?: "center" | "top";
  children: React.ReactNode;
}) {
  return (
    <main
      className={`flex min-h-dvh flex-col bg-gradient-to-b px-4 py-5 transition-colors ${TONES[tone]} ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-white p-6 text-center shadow-xl">{children}</div>;
}

function Spinner() {
  return (
    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
  );
}

function PulseDots() {
  return (
    <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-2 w-2 animate-pulse rounded-full bg-sky-400"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

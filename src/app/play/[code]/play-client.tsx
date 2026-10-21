"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CHOICE_STYLES,
  NAME_MAX_LENGTH,
  PLAYER_POLL_MS,
  type LiveState,
  rankIn,
  withRanks,
} from "@/lib/live";
import { secondsUntil, useLiveState, useServerNow } from "@/lib/use-live-state";
import { useUiLang } from "@/components/ui-language";
import { dateLocale } from "@/lib/i18n";
import { liveText } from "@/lib/text/live";

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
  const t = liveText[useUiLang()];

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
  const [sending, setSending] = useState(false);

  if (!hydrated || (!state && !missing)) return <Screen tone="sky"><Spinner /></Screen>;

  if (missing || !state) {
    return (
      <Screen tone="slate">
        <Card>
          <h1 className="text-xl font-bold text-gray-900">{t.noQuiz(code)}</h1>
          <p className="mt-2 text-sm text-gray-500">{t.checkCode}</p>
          <Link href="/play" className="mt-4 inline-block font-medium text-sky-700 underline">
            {t.differentCode}
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
          <h1 className="text-xl font-bold text-gray-900">{t.removedTitle}</h1>
          <p className="mt-2 text-sm text-gray-500">{t.removedBody}</p>
          {state.phase !== "FINISHED" && (
            <button onClick={forget} className="mt-4 font-medium text-sky-700 underline">
              {t.joinDifferentName}
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
            <h1 className="text-xl font-bold text-gray-900">{t.finishedTitle}</h1>
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

  // Answers can be changed until the question closes. One at a time,
  // though: two changes in flight could reach the server in the wrong order
  // and leave it holding the answer the player had already moved away from.
  const submit = async (index: number, choiceId: string) => {
    if (sending || answers[index] === choiceId) return;
    setAnswerError(null);
    const previous = answers[index];
    const next = { ...answers, [index]: choiceId };
    setAnswers(next);
    write(`${idKey}:answers`, next);
    setSending(true);

    // On failure, go back to whatever the server still holds: the previous
    // answer if there was one, none if this was the first.
    const undo = () => {
      const rest = { ...next };
      if (previous) rest[index] = previous;
      else delete rest[index];
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
      setAnswerError(body.error ?? t.answerFailed);
    } catch {
      undo();
      setAnswerError(t.answerOffline);
    } finally {
      setSending(false);
    }
  };

  return (
    <Game
      state={state}
      now={now}
      me={me}
      chosen={answers[state.index] ?? null}
      sending={sending}
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
  const t = liveText[useUiLang()];
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Screen tone="sky">
      <Card>
        <p className="text-xs font-semibold tracking-wide text-sky-600 uppercase">{t.liveQuiz}</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">{state.title}</h1>
        {state.phase !== "LOBBY" && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t.lateJoin}</p>
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
              if (!res.ok) setError(body.error ?? t.joinFailed);
              else onJoined(body);
            } catch {
              setError(t.joinOffline);
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
            placeholder={t.yourName}
            aria-label={t.yourName}
            className="w-full rounded-2xl border-2 border-sky-200 px-4 py-3 text-center text-xl text-sky-950 outline-none focus:border-sky-500"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-2xl bg-sky-600 py-3 text-lg font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-40"
          >
            {busy ? t.joining : t.join}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-400">{t.playing(state.players)}</p>
      </Card>
    </Screen>
  );
}

function Game({
  state,
  now,
  me,
  chosen,
  sending,
  error,
  onAnswer,
}: {
  state: LiveState;
  now: number;
  me: Identity;
  chosen: string | null;
  sending: boolean;
  error: string | null;
  onAnswer: (index: number, choiceId: string) => void;
}) {
  const lang = useUiLang();
  const t = liveText[lang];
  const num = (n: number) => n.toLocaleString(dateLocale(lang));
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
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{t.youreIn}</h1>
          <p className="mt-1 text-gray-600">{t.lookForName}</p>
          <p className="mt-6 text-sm text-gray-400">{t.waiting(state.players)}</p>
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
            {t.questionOf(state.index + 1, state.total)}
          </p>
          <p className="mt-3 text-6xl font-bold text-gray-900 tabular-nums">
            {secondsUntil(state.startsAt, now)}
          </p>
          <p className="mt-2 text-gray-500">{t.getReady}</p>
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
    // Still tappable after choosing - a different option replaces the answer
    // until the clock runs out. Only time, or an answer still being sent,
    // locks the buttons.
    const locked = timeUp || sending;

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
            <span>{t.answeredCount(state.answered, state.players)}</span>
          </div>
          <p className="max-h-[45dvh] overflow-y-auto whitespace-pre-wrap text-gray-900">
            {state.question.body}
          </p>
          {state.question.diagramUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.question.diagramUrl}
              alt={t.diagramAlt}
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
                  isMine ? "ring-4 ring-white" : chosen || timeUp ? "opacity-40" : ""
                } ${locked ? "" : `${style.hover} active:scale-[0.98]`}`}
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
          {error ??
            (timeUp
              ? chosen
                ? t.timeUpAnswered
                : t.timeUp
              : chosen
                ? t.answerIn
                : "")}
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
            {right ? t.correct : chosen ? t.notThisTime : t.noAnswer}
          </h1>
          {right && mine?.gained ? (
            <p className="mt-1 text-3xl font-bold text-emerald-600">+{num(mine.gained)}</p>
          ) : null}
          {!right && correctText && (
            <p className="mt-2 text-sm text-gray-600">
              {t.answerWas}{" "}
              <span className="font-semibold">
                {CHOICE_STYLES[correctIndex % CHOICE_STYLES.length].letter}. {correctText}
              </span>
            </p>
          )}
          {mine && rank && (
            <p className="mt-5 rounded-xl bg-gray-50 px-3 py-2 text-gray-700">
              <span className="font-semibold">{t.rank(rank)}</span>
              {t.outOf(state.standings.length)} · {num(mine.score)} {t.pts}
            </p>
          )}
          <p className="mt-4 text-xs text-gray-400">
            {state.index + 1 >= state.total ? t.finalComing : t.nextComing}
          </p>
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
          <p className="text-sm font-semibold tracking-wide text-amber-600 uppercase">{t.finalResults}</p>
          {rank && (
            <>
              <div className="mt-2 text-5xl">{rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "⭐"}</div>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{t.place(rank)}</h1>
              <p className="text-gray-600">
                {mine && num(mine.score)} {t.pts} · {t.players(state.standings.length)}
              </p>
            </>
          )}
          <ol className="mt-5 flex flex-col gap-1 text-left">
            {withRanks(state.standings).slice(0, 3).map((s) => (
              <li
                key={s.id}
                className={`flex justify-between rounded-lg px-3 py-1.5 ${s.id === me.participantId ? "bg-amber-100" : "bg-gray-50"}`}
              >
                <span className="truncate">
                  {["🥇", "🥈", "🥉"][s.rank - 1]} {s.name}
                </span>
                <span className="font-semibold tabular-nums">{num(s.score)}</span>
              </li>
            ))}
          </ol>
          {state.standings.length > 3 && (
            // Everyone, not just the podium: most of a hall is not in the top
            // three, and wants to see where their friends came.
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-center text-sm font-medium text-amber-700">
                {t.allPlayers(state.standings.length)}
              </summary>
              <ol className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto">
                {withRanks(state.standings).map((s) => (
                  <li
                    key={s.id}
                    className={`flex justify-between gap-2 rounded-lg px-3 py-1 text-sm ${
                      s.id === me.participantId ? "bg-amber-100 font-semibold" : ""
                    }`}
                  >
                    <span className="truncate">
                      <span className="mr-2 text-gray-400 tabular-nums">{s.rank}</span>
                      {s.name}
                    </span>
                    <span className="tabular-nums">{num(s.score)}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p className="mt-4 text-xs text-gray-400">{t.thanks}</p>
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

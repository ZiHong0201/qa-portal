"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  closeQuestion,
  finishQuiz,
  nextQuestion,
  removePlayer,
} from "@/lib/actions/live";
import { CHOICE_STYLES, HOST_POLL_MS, type LiveState } from "@/lib/live";
import { secondsUntil, useLiveState, useServerNow } from "@/lib/use-live-state";

/**
 * The projector view of a live game, and the host's controls for it.
 *
 * Built to be read from the back of a hall: large type, high contrast, and
 * the join code kept on screen throughout so latecomers can still get in.
 */
export function HostScreen({
  quizId,
  code,
  joinHost,
  qrSvg,
}: {
  quizId: string;
  code: string;
  joinHost: string;
  qrSvg: string;
}) {
  const { state, offset, refresh } = useLiveState(code, HOST_POLL_MS);
  const now = useServerNow(offset);
  const [busy, setBusy] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  // Close the question as soon as everyone has answered, rather than making a
  // hall sit through the rest of the clock. Once per question: the ref stops a
  // second poll firing it again before the state catches up.
  const autoClosed = useRef(-1);
  const everyoneIn =
    state?.phase === "QUESTION" &&
    state.players > 0 &&
    state.answered >= state.players &&
    (state.endsAt ?? 0) > now;
  useEffect(() => {
    if (!state || !everyoneIn || autoClosed.current === state.index) return;
    autoClosed.current = state.index;
    void closeQuestion(quizId, state.index).then(() => refresh());
  }, [everyoneIn, state, quizId, refresh]);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen();
  };

  const codeSpaced = `${code.slice(0, 3)} ${code.slice(3)}`;

  return (
    <div
      ref={stage}
      // Rounded inside the admin page; the Full screen button turns it into
      // the whole projector image, where the rounding disappears.
      className="relative flex min-h-[calc(100dvh-12rem)] flex-col rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 px-6 py-5 text-white [&:fullscreen]:rounded-none"
    >
      {/* Top bar: join details always visible, for whoever arrives late. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/80">
        <span className="text-sm">
          Join at <span className="font-semibold text-white">{joinHost}</span>
        </span>
        <span className="font-mono text-lg font-bold tracking-widest text-white">{codeSpaced}</span>
        {state && state.phase !== "LOBBY" && (
          <span className="text-sm">
            {state.players} player{state.players === 1 ? "" : "s"}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-sm">
          <button onClick={fullscreen} className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">
            Full screen
          </button>
          {state && state.phase !== "FINISHED" && (
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("End the game now and show the final results?")) {
                  void act(() => finishQuiz(quizId));
                }
              }}
              className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20"
            >
              End game
            </button>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col py-6">
        {!state ? (
          <div className="m-auto h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        ) : (
          <Stage
            state={state}
            now={now}
            busy={busy}
            qrSvg={qrSvg}
            joinHost={joinHost}
            codeSpaced={codeSpaced}
            onStart={() => act(() => nextQuestion(quizId, -1))}
            onNext={() => act(() => nextQuestion(quizId, state.index))}
            onClose={() => act(() => closeQuestion(quizId, state.index))}
            onFinish={() => act(() => finishQuiz(quizId))}
            onRemove={(id) => act(() => removePlayer(quizId, id))}
          />
        )}
      </div>
    </div>
  );
}

function Stage({
  state,
  now,
  busy,
  qrSvg,
  joinHost,
  codeSpaced,
  onStart,
  onNext,
  onClose,
  onFinish,
  onRemove,
}: {
  state: LiveState;
  now: number;
  busy: boolean;
  qrSvg: string;
  joinHost: string;
  codeSpaced: string;
  onStart: () => void;
  onNext: () => void;
  onClose: () => void;
  onFinish: () => void;
  onRemove: (participantId: string) => void;
}) {
  const primary =
    "rounded-2xl bg-white px-8 py-4 text-xl font-bold text-indigo-900 shadow-lg transition hover:bg-indigo-50 disabled:opacity-40";

  if (state.phase === "LOBBY") {
    const lobby = state.lobby ?? [];
    return (
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-center">
          <div
            className="w-64 rounded-3xl bg-white p-4 shadow-2xl sm:w-80 [&>svg]:h-auto [&>svg]:w-full"
            aria-label={`QR code to join at ${joinHost}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="text-center md:text-left">
            <p className="text-lg text-white/70">Scan, or go to</p>
            <p className="text-3xl font-bold">{joinHost}</p>
            <p className="mt-6 text-lg text-white/70">and enter the code</p>
            <p className="font-mono text-7xl font-black tracking-widest sm:text-8xl">{codeSpaced}</p>
            <p className="mt-4 text-white/60">{state.title}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-semibold">
            {lobby.length} player{lobby.length === 1 ? "" : "s"} joined
          </p>
          {/* Click a name to remove it - for the name someone thought was funny. */}
          <ul className="flex max-w-5xl flex-wrap justify-center gap-2">
            {lobby.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${p.name} from the game?`)) onRemove(p.id);
                  }}
                  title="Remove this player"
                  className="animate-card-enter rounded-full bg-white/15 px-4 py-1.5 font-medium hover:bg-rose-500/80"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={onStart} disabled={busy || lobby.length === 0} className={`${primary} mt-2`}>
            Start quiz ▶
          </button>
          <p className="text-sm text-white/50">
            {state.total} questions · {state.secondsPerQuestion} seconds each
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "PRE") {
    return (
      <div className="m-auto text-center">
        <p className="text-3xl font-semibold text-white/80">
          Question {state.index + 1} of {state.total}
        </p>
        <p className="mt-4 text-[10rem] leading-none font-black tabular-nums">
          {secondsUntil(state.startsAt, now)}
        </p>
        <p className="mt-2 text-2xl text-white/70">Get ready…</p>
      </div>
    );
  }

  if ((state.phase === "QUESTION" || state.phase === "REVEAL") && state.question) {
    const reveal = state.phase === "REVEAL" ? state.reveal : null;
    const left = secondsUntil(state.endsAt, now);
    const counts = reveal?.counts ?? {};
    const most = Math.max(1, ...Object.values(counts));
    const last = state.index + 1 >= state.total;

    return (
      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xl text-white/70">
              Question {state.index + 1} of {state.total}
            </span>
            {reveal ? (
              <span className="text-xl font-semibold">{state.answered} answered</span>
            ) : (
              <span className="flex items-center gap-4">
                <span className="text-xl">
                  {state.answered} / {state.players} answered
                </span>
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black tabular-nums ${
                    left <= 5 ? "bg-rose-500" : "bg-white/15"
                  }`}
                >
                  {left}
                </span>
              </span>
            )}
          </div>

          <div className="max-h-[40vh] overflow-y-auto rounded-2xl bg-white p-6 text-indigo-950 shadow-xl">
            <p className="text-2xl leading-snug font-semibold whitespace-pre-wrap">{state.question.body}</p>
            {state.question.diagramUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.question.diagramUrl}
                alt="Diagram for this question"
                className="mx-auto mt-4 max-h-[30vh] rounded-md"
              />
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {state.question.choices.map((c, i) => {
              const style = CHOICE_STYLES[i % CHOICE_STYLES.length];
              const isRight = reveal?.correctChoiceId === c.id;
              const n = counts[c.id] ?? 0;
              return (
                <div
                  key={c.id}
                  className={`relative overflow-hidden rounded-2xl px-5 py-4 shadow-lg transition-opacity ${style.bg} ${
                    reveal && !isRight ? "opacity-35" : ""
                  } ${isRight ? "ring-4 ring-white" : ""}`}
                >
                  {reveal && (
                    // How the room split, as a bar behind the text.
                    <div
                      className="absolute inset-y-0 left-0 bg-black/20 transition-[width] duration-700"
                      style={{ width: `${(n / most) * 100}%` }}
                    />
                  )}
                  <div className="relative flex items-center gap-3 text-xl font-semibold">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25">
                      {isRight ? "✓" : style.letter}
                    </span>
                    <span className="flex-1">{c.text}</span>
                    {reveal && <span className="text-2xl font-black tabular-nums">{n}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex justify-center pt-2">
            {reveal ? (
              last ? (
                <button onClick={onFinish} disabled={busy} className={primary}>
                  Final results 🏆
                </button>
              ) : (
                <button onClick={onNext} disabled={busy} className={primary}>
                  Next question ▶
                </button>
              )
            ) : (
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-xl bg-white/10 px-5 py-2 text-white/80 hover:bg-white/20"
              >
                Stop the clock and show the answer
              </button>
            )}
          </div>
        </div>

        {reveal && state.standings && (
          <aside className="w-full rounded-2xl bg-white/10 p-5 lg:w-80">
            <h2 className="mb-3 text-xl font-bold">Top 5</h2>
            <ol className="flex flex-col gap-2">
              {state.standings.slice(0, 5).map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
                  <span className="w-6 text-lg font-bold text-white/70">{i + 1}</span>
                  <span className="flex-1 truncate text-lg font-semibold">{s.name}</span>
                  <span className="text-right">
                    <span className="block font-bold tabular-nums">{s.score.toLocaleString()}</span>
                    {!!s.gained && <span className="block text-xs text-emerald-300">+{s.gained}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    );
  }

  if (state.phase === "FINISHED" && state.standings) {
    const [first, second, third] = state.standings;
    const rest = state.standings.slice(3, 10);
    const podium = [
      { p: second, place: 2, h: "h-40", medal: "🥈" },
      { p: first, place: 1, h: "h-56", medal: "🥇" },
      { p: third, place: 3, h: "h-28", medal: "🥉" },
    ];
    return (
      <div className="flex flex-1 flex-col items-center gap-8">
        <h2 className="text-4xl font-black">Final results</h2>
        <div className="flex items-end gap-4">
          {podium.map(({ p, place, h, medal }) =>
            p ? (
              <div key={place} className="flex w-44 flex-col items-center">
                <span className="text-5xl">{medal}</span>
                <span className="mt-2 w-full truncate text-center text-2xl font-bold">{p.name}</span>
                <span className="text-lg text-white/70 tabular-nums">{p.score.toLocaleString()}</span>
                <div
                  className={`mt-2 flex w-full items-start justify-center rounded-t-2xl bg-white/15 pt-3 text-4xl font-black ${h}`}
                >
                  {place}
                </div>
              </div>
            ) : (
              <div key={place} className="w-44" />
            )
          )}
        </div>
        {rest.length > 0 && (
          <ol className="grid w-full max-w-3xl gap-2 sm:grid-cols-2" start={4}>
            {rest.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
                <span className="w-6 font-bold text-white/60">{i + 4}</span>
                <span className="flex-1 truncate font-semibold">{s.name}</span>
                <span className="font-bold tabular-nums">{s.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
        <Link href="/admin/live" className="text-white/70 underline hover:text-white">
          Back to live quizzes
        </Link>
      </div>
    );
  }

  return <div className="m-auto h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />;
}

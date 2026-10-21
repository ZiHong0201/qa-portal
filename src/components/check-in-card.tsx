"use client";

import { useState, useTransition } from "react";
import { claimDailyCheckIn } from "@/lib/actions/check-in";
import {
  CHECK_IN_MILESTONE_EVERY,
  CHECK_IN_MILESTONE_BONUS,
  CHECK_IN_MAX_DAILY_MARKS,
  type CheckInState,
} from "@/lib/check-in";
import { useUiLang } from "@/components/ui-language";
import { homeText } from "@/lib/text/home";

function StreakDots({ streak, dayTitle }: { streak: number; dayTitle: (n: number) => string }) {
  // Position within the current week of the streak, so the dots fill up and
  // reset every seventh day alongside the milestone bonus.
  const done = streak === 0 ? 0 : ((streak - 1) % CHECK_IN_MILESTONE_EVERY) + 1;
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: CHECK_IN_MILESTONE_EVERY }, (_, i) => (
        <span
          key={i}
          title={dayTitle(i + 1)}
          className={`h-2.5 w-2.5 rounded-full ${
            i < done ? "bg-amber-400" : "bg-white/40 ring-1 ring-white/60"
          }`}
        />
      ))}
    </div>
  );
}

export function CheckInCard({ state }: { state: CheckInState }) {
  const t = homeText[useUiLang()];
  const [claimed, setClaimed] = useState(state.todayCheckIn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Days already banked, versus what the streak becomes if they claim now.
  const streak = claimed ? claimed.streak : state.currentStreak;
  const streakIfClaimed = claimed ? claimed.streak : state.currentStreak + 1;
  const remainder = streakIfClaimed % CHECK_IN_MILESTONE_EVERY;
  // 0 means claiming right now IS the weekly milestone, so the marks on offer
  // already include the bonus and the "N days to go" hint would contradict it.
  const daysToMilestone = remainder === 0 ? 0 : CHECK_IN_MILESTONE_EVERY - remainder;

  function claim() {
    setError(null);
    startTransition(async () => {
      const result = await claimDailyCheckIn();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.claimed) {
        setClaimed({ streak: result.claimed.streak, pointsAwarded: result.claimed.marks });
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 p-5 text-white shadow-md">
      {/* soft glow, purely decorative */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-sky-200 uppercase">{t.dailyCheckIn}</p>
          <p className="mt-1 text-xl font-bold">
            {streak > 0 ? t.streakInARow(streak) : t.startStreak}
          </p>

          <div className="mt-2">
            <StreakDots streak={streak} dayTitle={t.dayOfWeek} />
          </div>

          <p className="mt-2 text-sm text-sky-100">
            {claimed ? (
              <>
                {t.claimedBefore}
                <span className="font-semibold text-white">{t.bonusMarks(claimed.pointsAwarded)}</span>
                {t.claimedAfter(daysToMilestone === 0, CHECK_IN_MILESTONE_BONUS)}
              </>
            ) : (
              <>
                {t.offerBefore}
                <span className="font-semibold text-white">{t.bonusMarks(state.marksAvailable)}</span>
                {daysToMilestone === 0
                  ? t.offerFullWeek(CHECK_IN_MILESTONE_BONUS)
                  : t.offerToGo(daysToMilestone, CHECK_IN_MILESTONE_BONUS)}
              </>
            )}
          </p>
          {error && <p className="mt-2 text-sm font-medium text-amber-200">{error}</p>}
        </div>

        <div className="shrink-0">
          {claimed ? (
            <div className="flex flex-col items-center rounded-xl bg-white/15 px-5 py-3 text-center ring-1 ring-white/30">
              <span className="text-2xl">✓</span>
              <span className="text-xs font-semibold text-sky-100">{t.doneToday}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={claim}
              disabled={pending}
              className="animate-cat-pop rounded-xl bg-white px-6 py-3 font-bold text-sky-700 shadow-sm hover:bg-sky-50 active:scale-95 disabled:opacity-60"
            >
              {pending ? t.checkingIn : t.checkInButton(state.marksAvailable)}
            </button>
          )}
        </div>
      </div>

      <p className="relative mt-3 text-xs text-sky-200/80">
        {t.checkInRules(CHECK_IN_MAX_DAILY_MARKS, CHECK_IN_MILESTONE_BONUS, CHECK_IN_MILESTONE_EVERY)}
      </p>
    </div>
  );
}

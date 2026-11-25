import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dayKey } from "@/lib/check-in";
import { getPetRow } from "@/lib/study-pet.server";
import {
  DAILY_GOAL,
  DAILY_GROWTH_CAP,
  STAGES,
  STAGE_GROWTH,
  countToday,
  currentStreak,
  lookOf,
  stageProgress,
  type PetLook,
  type Stage,
} from "@/lib/study-pet";
import { petText as t } from "@/lib/text/pet";
import { PetArt } from "@/components/pet-art";
import { EggPicker } from "./egg-picker";
import { HatchForm } from "./hatch-form";

// How long after hatching the pet page still plays the hatching animation -
// long enough to survive the page re-rendering after the form, short enough
// that it is not replayed on a later visit.
const JUST_HATCHED_MS = 60_000;

function hatchedRecently(hatchedAt: Date | null): boolean {
  return !!hatchedAt && Date.now() - hatchedAt.getTime() < JUST_HATCHED_MS;
}

export default async function PetPage() {
  const session = await auth();
  if (session?.user.role !== "STUDENT") redirect("/dashboard");

  const today = dayKey();
  const row = await getPetRow(session.user.id);
  const look = row ? lookOf(row, today) : null;

  // No egg picked yet. Any answers already given are on the row and will
  // count the moment they pick.
  if (!row || !look) return <EggPicker />;

  if (look.stage === "egg") {
    const toHatch = Math.max(0, STAGE_GROWTH.hatchling - row.growth);
    const elementName = t.elements[look.element].name;
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-sky-950">{t.eggTitle(elementName)}</h1>
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-6 text-center shadow-sm">
          <PetArt
            look={look}
            warmth={row.growth / STAGE_GROWTH.hatchling}
            className="mx-auto h-52 w-52"
            title={t.eggTitle(elementName)}
          />
          {toHatch > 0 ? (
            <>
              <p className="mt-4 font-medium text-sky-950">{t.eggToHatch(toHatch)}</p>
              <p className="mt-1 text-sm text-gray-500">{t.eggHow}</p>
              <ProgressBar fraction={row.growth / STAGE_GROWTH.hatchling} />
              <Link
                href="/dashboard/sets"
                className="mt-5 inline-block rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700"
              >
                {t.practise}
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 font-medium text-sky-950">{t.eggReady}</p>
              <HatchForm />
            </>
          )}
        </div>
      </div>
    );
  }

  const name = row.name ?? "";
  const progress = stageProgress(row.growth, look.stage);
  const todayCount = countToday(row, today);
  const streak = currentStreak(row, today);
  const justHatched = hatchedRecently(row.hatchedAt);
  const element = t.elements[look.element];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-6 text-center shadow-sm">
        <div className={justHatched ? "animate-pet-hatch" : undefined}>
          <PetArt look={look} className="mx-auto h-56 w-56" title={`${name}, your ${element.name} pet`} />
        </div>
        <h1 className="mt-2 text-2xl font-bold text-sky-950">
          {name}
          {look.rare && (
            <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">
              ✦ {t.rare}
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500">
          {element.name} · {t.stages[look.stage]}
        </p>
        <p className="mt-3 text-sky-900">{t.moods[look.mood](name)}</p>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-sky-950">{t.growth}</h2>
          <span className="text-sm text-gray-500">
            {progress.next ? t.toNext(progress.needed, t.stages[progress.next]) : t.maxed}
          </span>
        </div>
        <ProgressBar fraction={progress.fraction} />
        <GrowthPath look={look} />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500">{t.todayGoal}</h2>
          <p className="mt-1 text-xl font-bold text-sky-950">
            {todayCount >= DAILY_GOAL ? t.goalDone : t.todayOf(todayCount, DAILY_GOAL)}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {Array.from({ length: DAILY_GOAL }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${i < todayCount ? "bg-emerald-500" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500">{t.streak}</h2>
          <p className="mt-1 text-xl font-bold text-sky-950">
            {streak > 0 && "🔥 "}
            {t.streakDays(streak)}
          </p>
        </div>
      </section>

      {todayCount >= DAILY_GROWTH_CAP && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t.capReached}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="max-w-xs text-xs text-gray-500">{t.howItWorks}</p>
        <Link
          href="/dashboard/sets"
          className="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white hover:bg-sky-700"
        >
          {t.practise}
        </Link>
      </div>
    </div>
  );
}

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Every stage the pet will pass through, with the ones still to come shown
 * as silhouettes - something to look forward to without spoiling the detail.
 */
function GrowthPath({ look }: { look: PetLook }) {
  const reached = STAGES.indexOf(look.stage);
  const shown = STAGES.filter((s) => s !== "egg") as Exclude<Stage, "egg">[];
  return (
    <ol className="mt-4 grid grid-cols-4 gap-2">
      {shown.map((stage) => {
        const i = STAGES.indexOf(stage);
        const done = i <= reached;
        return (
          <li key={stage} className="flex flex-col items-center gap-1">
            <div
              className={`rounded-xl p-1 ${i === reached ? "bg-sky-100 ring-2 ring-sky-300" : ""}`}
              style={done ? undefined : { filter: "brightness(0)", opacity: 0.18 }}
            >
              <PetArt look={{ ...look, stage, mood: "content" }} still className="h-14 w-14" />
            </div>
            <span className={`text-xs ${done ? "font-medium text-sky-900" : "text-gray-400"}`}>
              {done ? t.stages[stage] : "?"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

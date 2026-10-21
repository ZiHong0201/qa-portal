import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { feedbackLeftToday, isFeedbackEnabled, myFeedback } from "@/lib/feedback.server";
import { stars } from "@/lib/feedback";
import { dateLocale, type UiLang } from "@/lib/i18n";
import { getUiLang } from "@/lib/i18n.server";
import { feedbackText } from "@/lib/text/feedback";
import { FeedbackForm, StopQuotingButton } from "./feedback-form";

const sentOn = (d: Date, lang: UiLang) =>
  d.toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

export default async function FeedbackPage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getUiLang();
  const t = feedbackText[lang];

  const [student, sent, remaining, open] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, grade: true } }),
    myFeedback(userId),
    feedbackLeftToday(userId),
    isFeedbackEnabled(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{t.title}</h1>
      <p className="mb-6 text-sm text-gray-500">{t.intro}</p>

      {/* Closed, the page stays reachable so a student can still see what
          they sent and take back permission to quote it. */}
      {open ? (
        <FeedbackForm
          name={student?.name ?? session!.user.name ?? ""}
          grade={student?.grade ?? null}
          remaining={remaining}
        />
      ) : (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">{t.closed}</p>
      )}

      <h2 className="mt-8 mb-3 font-medium">{t.sentHeading}</h2>
      {sent.length === 0 ? (
        <p className="text-sm text-gray-500">{t.nothingYet}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sent.map((f) => (
            <li key={f.id} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
                  {t.kindLabels[f.kind]}
                </span>
                <span className="text-gray-500">{sentOn(f.createdAt, lang)}</span>
                {f.readAt && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">{t.readByTeacher}</span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-gray-800">{f.message}</p>
              {(f.rating !== null || f.wouldRecommend !== null) && (
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {f.rating !== null && <span className="text-amber-500">{stars(f.rating)}</span>}
                  {f.wouldRecommend !== null && (
                    <span>{f.wouldRecommend ? t.wouldRecommend : t.wouldNotRecommend}</span>
                  )}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                {f.mayQuote ? (
                  <>
                    {/* The credit line itself stays as stored - it is what the website prints. */}
                    <span>{t.mayBeQuoted(f.creditLine ?? "")}</span>
                    <StopQuotingButton feedbackId={f.id} />
                  </>
                ) : (
                  <span>{t.notForWebsite}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

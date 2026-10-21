import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import {
  archiveFeedback,
  markEveryFeedbackRead,
  markFeedbackRead,
  starFeedback,
  switchFeedback,
} from "@/lib/actions/feedback";
import {
  isFeedbackEnabled,
  listFeedback,
  ratingSummary,
  testimonialCount,
  unreadFeedbackCount,
  type FeedbackFilter,
  type FeedbackView,
} from "@/lib/feedback.server";
import { FEEDBACK_KINDS, KIND_LABELS, stars, type FeedbackKind } from "@/lib/feedback";

const VIEWS: { value: FeedbackView; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "starred", label: "Testimonials" },
  { value: "archived", label: "Archived" },
];

const sentAt = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });

const SMALL_BUTTON = "rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50";

/** Students' ideas, suggestions and feedback, newest first. */
export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; kind?: string; quote?: string }>;
}) {
  const params = await searchParams;
  // Anything unrecognised in the URL falls back to "no filter" rather than
  // to an empty list that looks like there is no feedback.
  const filter: FeedbackFilter = {
    view: VIEWS.some((v) => v.value === params.view) ? (params.view as FeedbackView) : "inbox",
    kind: FEEDBACK_KINDS.includes(params.kind as FeedbackKind) ? (params.kind as FeedbackKind) : null,
    quote: params.quote === "yes" ? true : params.quote === "no" ? false : null,
  };

  const [items, unread, starredCount, open, summary] = await Promise.all([
    listFeedback(filter),
    unreadFeedbackCount(),
    testimonialCount(),
    isFeedbackEnabled(),
    ratingSummary(),
  ]);

  // Each filter link keeps the other two filters as they are.
  const href = (change: Partial<Record<"view" | "kind" | "quote", string | null>>) => {
    const next = {
      view: filter.view === "inbox" ? null : filter.view,
      kind: filter.kind,
      quote: filter.quote === null ? null : filter.quote ? "yes" : "no",
      ...change,
    };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/admin/feedback?${s}` : "/admin/feedback";
  };
  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      active ? "border-sky-600 bg-sky-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Student feedback</h1>
        {unread > 0 && (
          <form action={markEveryFeedbackRead}>
            <SubmitButton pendingText="Marking…" className={SMALL_BUTTON}>
              Mark all {unread} read
            </SubmitButton>
          </form>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Star the good ones to use as testimonials on the website. Only messages the student allowed us to quote can be
        starred, and they are credited exactly as the student chose.
      </p>

      {(summary.ratings > 0 || summary.recommendAnswered > 0) && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Average rating</p>
            <p className="mt-0.5 text-2xl font-bold text-amber-500">
              {summary.average !== null ? `${summary.average.toFixed(1)} ★` : "—"}
            </p>
            <p className="text-xs text-gray-500">
              from {summary.ratings} rating{summary.ratings === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Would recommend Mr Tan</p>
            <p className="mt-0.5 text-2xl font-bold text-sky-900">
              {summary.recommendAnswered > 0
                ? `${Math.round((summary.recommendYes / summary.recommendAnswered) * 100)}%`
                : "—"}
            </p>
            <p className="text-xs text-gray-500">
              {summary.recommendYes} of {summary.recommendAnswered} said yes
            </p>
          </div>
        </div>
      )}

      <div
        className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
          open ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-gray-800">
            Feedback from students is{" "}
            <span className={open ? "text-green-700" : "text-gray-500"}>{open ? "on" : "off"}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {open
              ? "Students see the Feedback link, the banner at the top of their home page, and the form."
              : "The link, banner and form are hidden, and nothing new can be sent. Students can still see what they sent and stop it being quoted."}
          </p>
        </div>
        <form action={switchFeedback.bind(null, !open)}>
          <SubmitButton
            pendingText="Saving…"
            className={
              open
                ? SMALL_BUTTON
                : "rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
            }
          >
            {open ? "Turn off" : "Turn on"}
          </SubmitButton>
        </form>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-800">Testimonials for the website</p>
        <p className="mt-1 text-xs text-gray-500">
          {starredCount === 0
            ? "Nothing starred yet."
            : `${starredCount} starred. The download has each quote, the credit line the student chose, the date and their star rating - never an email address.`}{" "}
          A student can take back permission at any time; download again before each website update so a withdrawn
          quote comes off.
        </p>
        {starredCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/admin/feedback/export?format=json" className={SMALL_BUTTON}>
              Download JSON
            </a>
            <a href="/admin/feedback/export?format=csv" className={SMALL_BUTTON}>
              Download CSV
            </a>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Link key={v.value} href={href({ view: v.value === "inbox" ? null : v.value })} className={pill(filter.view === v.value)}>
              {v.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Type:</span>
          <Link href={href({ kind: null })} className={pill(filter.kind === null)}>
            All
          </Link>
          {FEEDBACK_KINDS.map((k) => (
            <Link key={k} href={href({ kind: k })} className={pill(filter.kind === k)}>
              {KIND_LABELS[k]}
            </Link>
          ))}
          <span className="ml-2 text-xs text-gray-500">Quoting:</span>
          <Link href={href({ quote: null })} className={pill(filter.quote === null)}>
            Any
          </Link>
          <Link href={href({ quote: "yes" })} className={pill(filter.quote === true)}>
            Allowed
          </Link>
          <Link href={href({ quote: "no" })} className={pill(filter.quote === false)}>
            Not allowed
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">Nothing here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((f) => (
            <li
              key={f.id}
              className={`rounded-lg border bg-white p-4 ${f.readAt ? "border-gray-200" : "border-sky-300 ring-1 ring-sky-100"}`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                {!f.readAt && <span className="rounded-full bg-sky-600 px-2 py-0.5 font-medium text-white">New</span>}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                  {KIND_LABELS[f.kind]}
                </span>
                {f.starredAt && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">★ Testimonial</span>
                )}
                {f.studentId ? (
                  <Link href={`/admin/students/${f.studentId}`} className="font-medium text-gray-800 hover:underline">
                    {f.studentName}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-800">
                    {f.studentName} <span className="font-normal text-gray-400">(account deleted)</span>
                  </span>
                )}
                {f.studentGrade && <span className="text-gray-500">{f.studentGrade}</span>}
                <span className="text-gray-400">{sentAt(f.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{f.message}</p>
              {(f.rating !== null || f.wouldRecommend !== null) && (
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {f.rating !== null && <span className="text-amber-500">{stars(f.rating)}</span>}
                  {f.wouldRecommend !== null && (
                    <span>{f.wouldRecommend ? "Would recommend" : "Would not recommend"}</span>
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {f.mayQuote ? (
                    <>
                      May be quoted as <span className="font-medium text-gray-800">&ldquo;{f.creditLine}&rdquo;</span>
                    </>
                  ) : (
                    "Not for quoting"
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <form action={markFeedbackRead.bind(null, f.id, !f.readAt)}>
                    <SubmitButton pendingText="Saving…" className={SMALL_BUTTON}>
                      {f.readAt ? "Mark unread" : "Mark read"}
                    </SubmitButton>
                  </form>
                  {f.mayQuote && !f.archivedAt && (
                    <form action={starFeedback.bind(null, f.id, !f.starredAt)}>
                      <SubmitButton
                        pendingText="Saving…"
                        className={
                          f.starredAt
                            ? SMALL_BUTTON
                            : "rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-900 hover:bg-amber-100"
                        }
                      >
                        {f.starredAt ? "Unstar" : "★ Star as testimonial"}
                      </SubmitButton>
                    </form>
                  )}
                  <form action={archiveFeedback.bind(null, f.id, !f.archivedAt)}>
                    <SubmitButton pendingText="Saving…" className={SMALL_BUTTON}>
                      {f.archivedAt ? "Unarchive" : "Archive"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

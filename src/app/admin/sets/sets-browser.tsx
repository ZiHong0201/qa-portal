"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteQuestionSet, toggleQuestionSetActive } from "@/lib/actions/questionSets";
import { SubmitButton } from "@/components/submit-button";

export type BrowsableSet = {
  id: string;
  title: string;
  subject: string;
  isActive: boolean;
  grades: { grade: string }[];
  _count: { questions: number };
  questions: { _count: { submissions: number } }[];
};

const NO_GRADE = "No grade assigned";

function FolderGrid({
  items,
  onSelect,
}: {
  items: { label: string; count: number }[];
  onSelect: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map(({ label, count }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(label)}
          className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-sky-300 hover:shadow-sm"
        >
          <span className="text-2xl" aria-hidden="true">
            📁
          </span>
          <span className="font-medium">{label}</span>
          <span className="text-sm text-gray-500">
            {count} set{count === 1 ? "" : "s"}
          </span>
        </button>
      ))}
    </div>
  );
}

function Breadcrumb({ crumbs }: { crumbs: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {c.onClick ? (
            <button type="button" onClick={c.onClick} className="hover:text-sky-700 hover:underline">
              {c.label}
            </button>
          ) : (
            <span className="font-medium text-gray-700">{c.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function SetsBrowser({ sets }: { sets: BrowsableSet[] }) {
  const [subject, setSubject] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);

  const subjects = Array.from(new Set(sets.map((s) => s.subject))).sort();

  if (subject === null) {
    return (
      <FolderGrid
        items={subjects.map((subj) => ({
          label: subj,
          count: sets.filter((s) => s.subject === subj).length,
        }))}
        onSelect={setSubject}
      />
    );
  }

  const setsInSubject = sets.filter((s) => s.subject === subject);

  if (grade === null) {
    const grades = Array.from(
      new Set(setsInSubject.flatMap((s) => (s.grades.length ? s.grades.map((g) => g.grade) : [NO_GRADE])))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return (
      <div>
        <Breadcrumb crumbs={[{ label: "All subjects", onClick: () => setSubject(null) }, { label: subject }]} />
        <FolderGrid
          items={grades.map((g) => ({
            label: g,
            count: setsInSubject.filter((s) =>
              g === NO_GRADE ? s.grades.length === 0 : s.grades.some((sg) => sg.grade === g)
            ).length,
          }))}
          onSelect={setGrade}
        />
      </div>
    );
  }

  const setsInGrade = setsInSubject.filter((s) =>
    grade === NO_GRADE ? s.grades.length === 0 : s.grades.some((sg) => sg.grade === grade)
  );

  return (
    <div>
      <Breadcrumb
        crumbs={[
          { label: "All subjects", onClick: () => setSubject(null) },
          { label: subject, onClick: () => setGrade(null) },
          { label: grade },
        ]}
      />
      <ul className="flex flex-col gap-3">
        {setsInGrade.map((set) => {
          const submissionCount = set.questions.reduce((n, q) => n + q._count.submissions, 0);
          return (
            <li key={set.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/admin/sets/${set.id}`} className="font-medium hover:underline">
                    {set.title}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {set.grades.map((g) => g.grade).join(", ") || "No grades"} · {set.subject} ·{" "}
                    {set._count.questions} question
                    {set._count.questions === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      set.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {set.isActive ? "Active" : "Inactive"}
                  </span>
                  <Link href={`/admin/sets/${set.id}/edit`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                  <form action={toggleQuestionSetActive.bind(null, set.id, !set.isActive)}>
                    <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                      {set.isActive ? "Deactivate" : "Activate"}
                    </SubmitButton>
                  </form>
                  {submissionCount === 0 && (
                    <form action={deleteQuestionSet.bind(null, set.id)}>
                      <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                        Delete
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {setsInGrade.length === 0 && <p className="text-gray-500">No question sets here.</p>}
      </ul>
    </div>
  );
}

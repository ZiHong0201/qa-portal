"use client";

import { useActionState, useState, useTransition } from "react";
import { addStudent, removeStudent, saveGradeAndSubjects } from "@/lib/actions/fees";
import type { Result } from "@/lib/fees.server";
import { GradeSelect, Message, MonthlyHint, SubjectTicks, button, input } from "./form-parts";

export function NewStudentForm({ grades, subjects }: { grades: string[]; subjects: string[] }) {
  const [state, action, pending] = useActionState(addStudent, {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={input}
        />
        <span className="text-xs font-normal text-gray-500">What they log in to the exercise portal with.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          autoComplete="new-password"
          className={input}
        />
        <span className="text-xs font-normal text-gray-500">At least 8 characters. Pass it to them yourself.</span>
      </label>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Grade</span>
        <div>
          <GradeSelect grades={grades} value={grade} onChange={setGrade} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Subjects</span>
        <SubjectTicks subjects={subjects} chosen={chosen} onChange={setChosen} />
        <MonthlyHint grade={grade} count={chosen.length} />
      </div>
      <Message state={state} />
      <button disabled={pending} className={`${button} self-start`}>
        {pending ? "Creating..." : "Create student"}
      </button>
    </form>
  );
}

export function GradeSubjectsForm({
  studentId,
  grades,
  subjects,
  grade: initialGrade,
  enrolled,
}: {
  studentId: string;
  grades: string[];
  subjects: string[];
  grade: string;
  enrolled: string[];
}) {
  const [state, action, pending] = useActionState(saveGradeAndSubjects.bind(null, studentId), {});
  const [grade, setGrade] = useState(initialGrade);
  const [chosen, setChosen] = useState(enrolled);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-16 text-sm text-gray-600">Grade</span>
        <GradeSelect grades={grades} value={grade} onChange={setGrade} />
      </div>
      <SubjectTicks subjects={subjects} chosen={chosen} onChange={setChosen} />
      <MonthlyHint grade={grade} count={chosen.length} />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={button}>
          Save grade and subjects
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function DeleteStudentButton({ studentId, name }: { studentId: string; name: string }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        disabled={busy}
        onClick={() => {
          const typed = prompt(
            `This deletes ${name}'s portal account with all their answers, marks and points. ` +
              `Receipts already sent are kept.\n\nType the student's name to confirm:`
          );
          if (typed === null) return;
          if (typed.trim() !== name) {
            setState({ error: "The name did not match, so nothing was deleted." });
            return;
          }
          start(async () => setState((await removeStudent(studentId)) ?? {}));
        }}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
      >
        {busy ? "Deleting..." : "Delete student account"}
      </button>
      <Message state={state} />
    </div>
  );
}

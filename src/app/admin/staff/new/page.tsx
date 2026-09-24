import Link from "next/link";
import { StaffForm } from "../staff-form";
import { createStaff } from "@/lib/actions/staff";

export default function NewStaffPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">New staff account</h1>
      <p className="mb-6 text-sm text-gray-600">
        Teachers and admins both log in through the same page as students; what they see is
        decided by the role below.
      </p>
      <StaffForm action={createStaff} submitLabel="Create account" />
      <Link href="/admin/staff" className="mt-4 inline-block text-sm text-sky-700 hover:underline">
        ← Back to staff
      </Link>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { StaffForm } from "../../staff-form";
import { updateStaff } from "@/lib/actions/staff";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, staff, adminCount] = await Promise.all([
    auth(),
    prisma.user.findUnique({ where: { id } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);
  if (!staff || (staff.role !== "TEACHER" && staff.role !== "ADMIN")) notFound();

  // The same two rules the action enforces, said in advance so the radio is
  // not offered and then refused. The action still checks - this is the
  // courtesy, not the guard.
  const roleLocked =
    staff.role === "ADMIN" && session?.user.id === staff.id
      ? "You cannot change your own role. Another admin can do it for you."
      : staff.role === "ADMIN" && adminCount <= 1
        ? "This is the only admin account, so its role cannot be changed. Create a second admin first."
        : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit {staff.name}</h1>
      <StaffForm
        action={updateStaff.bind(null, staff.id)}
        initial={{ name: staff.name, email: staff.email, role: staff.role }}
        submitLabel="Save changes"
        roleLocked={roleLocked}
      />
      <Link href="/admin/staff" className="mt-4 inline-block text-sm text-sky-700 hover:underline">
        ← Back to staff
      </Link>
    </div>
  );
}

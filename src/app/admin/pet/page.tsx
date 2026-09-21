import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { PetCat } from "@/components/pet-cat";
import { setPetAccess, togglePetItemActive, deletePetItem } from "@/lib/actions/pet-admin";
import { currentStats } from "@/lib/pet";

const KIND_LABEL: Record<string, string> = {
  CLOTHING: "Clothing",
  FOOD: "Food",
  SNACK: "Snack",
};

export default async function AdminPetPage() {
  const [items, students] = await Promise.all([
    prisma.petItem.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      include: { _count: { select: { purchases: true } } },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: [{ petEnabled: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        grade: true,
        petEnabled: true,
        pet: { select: { name: true, coat: true, hunger: true, happiness: true, statsAt: true } },
      },
    }),
  ]);

  const enabled = students.filter((s) => s.petEnabled);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-bold">Virtual cat</h1>
        <p className="mb-4 text-sm text-gray-500">
          Off for everyone by default. Turn it on per student below. Food and clothes are paid for
          out of the same points balance as the catalogue.
        </p>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Access · {enabled.length} of {students.length} students
          </div>
          <ul className="divide-y divide-gray-100">
            {students.map((s) => {
              const stats = s.pet ? currentStats(s.pet) : null;
              return (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {s.pet ? (
                      <PetCat coat={s.pet.coat} className="h-9 w-9 shrink-0" />
                    ) : (
                      <span className="h-9 w-9 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">
                        {s.grade ?? "No form"}
                        {s.pet && stats
                          ? ` · ${s.pet.name} · hunger ${stats.hunger}%, happiness ${stats.happiness}%`
                          : s.petEnabled
                            ? " · not adopted yet"
                            : ""}
                      </p>
                    </div>
                  </div>
                  <form action={setPetAccess.bind(null, s.id, !s.petEnabled)} className="shrink-0">
                    <SubmitButton
                      pendingText="…"
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        s.petEnabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {s.petEnabled ? "On" : "Off"}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
            {students.length === 0 && <li className="px-4 py-3 text-gray-500">No students yet.</li>}
          </ul>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Shop items</h2>
          <Link
            href="/admin/pet/new"
            className="shrink-0 rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New item
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Clothing is bought once and kept. Food and snacks are eaten on purchase.
        </p>

        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.kind === "CLOTHING" && (
                  <PetCat coat="grey" equipped={[item.key]} className="h-12 w-12 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {item.name}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {KIND_LABEL[item.kind]}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.cost} pts
                    {item.kind !== "CLOTHING" &&
                      ` · +${item.hungerEffect} hunger, +${item.happinessEffect} happiness`}
                    {item._count.purchases > 0 && ` · bought ${item._count.purchases}×`}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.isActive ? "In shop" : "Hidden"}
                </span>
                <Link href={`/admin/pet/${item.id}/edit`} className="text-blue-600 hover:underline">
                  Edit
                </Link>
                <form action={togglePetItemActive.bind(null, item.id, !item.isActive)}>
                  <SubmitButton pendingText="…" className="text-blue-600 hover:underline">
                    {item.isActive ? "Hide" : "Show"}
                  </SubmitButton>
                </form>
                {item._count.purchases === 0 && (
                  <form action={deletePetItem.bind(null, item.id)}>
                    <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
          {items.length === 0 && <p className="text-gray-500">No shop items yet.</p>}
        </ul>
      </section>
    </div>
  );
}

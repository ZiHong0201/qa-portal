import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteCatalogueItem, toggleCatalogueItemActive } from "@/lib/actions/catalogue";
import { SubmitButton } from "@/components/submit-button";
import { AddStockForm } from "./add-stock-form";
import { PendingGifts } from "./pending-gifts";

const day = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });

export default async function AdminGiftExchangePage() {
  const [items, pending, delivered, rejected] = await Promise.all([
    prisma.catalogueItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            // Every row, rejected included, decides whether the gift can be
            // deleted (the rows reference it); only the rest were exchanged.
            redemptions: true,
          },
        },
        redemptions: { where: { rejectedAt: null }, select: { id: true } },
      },
    }),
    prisma.redemption.findMany({
      where: { deliveredAt: null, rejectedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        student: { select: { name: true, grade: true } },
        catalogueItem: { select: { name: true } },
      },
    }),
    prisma.redemption.findMany({
      // The cat unlock is marked delivered the moment it is exchanged; it
      // was never on the list, so it does not belong among the deliveries.
      where: { deliveredAt: { not: null }, catalogueItem: { grantsPet: false } },
      orderBy: { deliveredAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        deliveredAt: true,
        student: { select: { name: true, grade: true } },
        catalogueItem: { select: { name: true } },
      },
    }),
    prisma.redemption.findMany({
      where: { rejectedAt: { not: null } },
      orderBy: { rejectedAt: "desc" },
      take: 10,
      select: {
        id: true,
        cost: true,
        rejectedAt: true,
        rejectionReason: true,
        student: { select: { name: true, grade: true } },
        catalogueItem: { select: { name: true } },
      },
    }),
  ]);

  // By grade, then name - the order the gifts are handed out in.
  const pendingRows = pending
    .map((r) => ({
      id: r.id,
      student: r.student.name,
      grade: r.student.grade,
      gift: r.catalogueItem.name,
      exchangedOn: day(r.createdAt),
    }))
    .sort((a, b) => (a.grade ?? "~").localeCompare(b.grade ?? "~") || a.student.localeCompare(b.student));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gift Exchange</h1>
        <Link
          href="/admin/catalogue/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          + New gift
        </Link>
      </div>

      <PendingGifts
        pending={pendingRows}
        recentlyDelivered={delivered.map((r) => ({
          id: r.id,
          student: r.student.name,
          grade: r.student.grade,
          gift: r.catalogueItem.name,
          exchangedOn: day(r.createdAt),
          deliveredOn: day(r.deliveredAt!),
        }))}
        recentlyRejected={rejected.map((r) => ({
          id: r.id,
          student: r.student.name,
          grade: r.student.grade,
          gift: r.catalogueItem.name,
          refunded: r.cost,
          reason: r.rejectionReason ?? "",
          rejectedOn: day(r.rejectedAt!),
        }))}
      />

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.cost} points · {item.redemptions.length} exchanged
                    {item.limitPerStudent !== null &&
                      ` · limit ${item.limitPerStudent} per student`}
                  </p>
                  <p className="mt-1 text-sm">
                    {item.stock === null ? (
                      <span className="text-gray-400">Stock not counted</span>
                    ) : item.stock === 0 ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                        Out of stock
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.stock <= 3 ? "bg-amber-100 text-amber-800" : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {item.stock} in stock
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                  <Link
                    href={`/admin/catalogue/${item.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={toggleCatalogueItemActive.bind(null, item.id, !item.isActive)}>
                    <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                      {item.isActive ? "Deactivate" : "Activate"}
                    </SubmitButton>
                  </form>
                  {item._count.redemptions === 0 && (
                    <form action={deleteCatalogueItem.bind(null, item.id)}>
                      <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                        Delete
                      </SubmitButton>
                    </form>
                  )}
                </div>
                {!item.grantsPet && <AddStockForm itemId={item.id} />}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-gray-500">No gifts yet.</p>}
      </ul>
    </div>
  );
}

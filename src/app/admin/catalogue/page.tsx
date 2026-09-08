import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteCatalogueItem, toggleCatalogueItemActive } from "@/lib/actions/catalogue";

export default async function AdminCataloguePage() {
  const items = await prisma.catalogueItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <Link
          href="/admin/catalogue/new"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          + New item
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
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
                    {item.cost} points · {item._count.redemptions} redemption
                    {item._count.redemptions === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
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
                  <button type="submit" className="text-blue-600 hover:underline">
                    {item.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
                {item._count.redemptions === 0 && (
                  <form action={deleteCatalogueItem.bind(null, item.id)}>
                    <button type="submit" className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-gray-500">No catalogue items yet.</p>}
      </ul>
    </div>
  );
}

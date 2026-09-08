import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";
import { RedeemButton } from "./redeem-button";

export default async function StudentCataloguePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [balance, items, redemptions] = await Promise.all([
    getStudentBalance(userId),
    prisma.catalogueItem.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    }),
    prisma.redemption.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
      include: { catalogueItem: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Gift catalogue</h1>
      <p className="mb-6 text-sm text-gray-500">You have {balance.balance} points to spend.</p>

      <ul className="mb-8 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-md border border-gray-200 object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  <p className="text-sm text-gray-500">{item.cost} points</p>
                </div>
              </div>
              <RedeemButton itemId={item.id} canAfford={balance.balance >= item.cost} />
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500">No gifts available right now. Check back soon.</p>
        )}
      </ul>

      <h2 className="mb-3 font-medium">Your redemptions</h2>
      <ul className="flex flex-col gap-2">
        {redemptions.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>{r.catalogueItem.name}</span>
            <span className="text-xs text-gray-400">
              -{r.cost} pts · {r.createdAt.toLocaleDateString()}
            </span>
          </li>
        ))}
        {redemptions.length === 0 && (
          <p className="text-sm text-gray-500">You haven&apos;t redeemed anything yet.</p>
        )}
      </ul>
    </div>
  );
}

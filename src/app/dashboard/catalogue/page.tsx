import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";
import { RedeemButton } from "./redeem-button";
import { PetPic } from "@/components/pet-pic";
import { getUiLang } from "@/lib/i18n.server";
import { dateLocale } from "@/lib/i18n";
import { rewardsText } from "@/lib/text/rewards";

export default async function GiftExchangePage() {
  const session = await auth();
  const userId = session!.user.id;
  const lang = await getUiLang();
  const t = rewardsText[lang].gift;

  const [balance, items, redemptions, student] = await Promise.all([
    getStudentBalance(userId),
    prisma.catalogueItem.findMany({
      where: { isActive: true },
      orderBy: { cost: "asc" },
    }),
    prisma.redemption.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: "desc" },
      include: { catalogueItem: { select: { name: true, grantsPet: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { petEnabled: true, pet: { select: { id: true } } },
    }),
  ]);

  // An unlocking item is a one-off, so once it is theirs the row says so
  // rather than offering to sell it again.
  const petUnlocked = !!student?.petEnabled || !!student?.pet;

  // Rejected exchanges were refunded and do not use up a limit.
  const mine = new Map<string, number>();
  for (const r of redemptions) {
    if (!r.rejectedAt) mine.set(r.catalogueItemId, (mine.get(r.catalogueItemId) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{t.title}</h1>
      <p className="mb-3 text-sm text-gray-500">{t.youHave(balance.balance)}</p>
      <p className="mb-6 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-900">
        {t.deliveryNote}
      </p>

      <ul className="mb-8 flex flex-col gap-3">
        {items.map((item) => {
          const taken = mine.get(item.id) ?? 0;
          const atLimit = item.limitPerStudent !== null && taken >= item.limitPerStudent;
          const outOfStock = item.stock !== null && item.stock <= 0;
          return (
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
                  {/* An unlocking item has no photograph to show, so the cat
                      itself stands in for one. */}
                  {item.grantsPet && !item.imageUrl && (
                    <PetPic pose="happy" className="h-20 w-20 shrink-0 object-contain" />
                  )}
                  <div>
                    <p className="font-medium">
                      {item.name}
                      {item.grantsPet && (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          {t.unlocksCat}
                        </span>
                      )}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    <p className="text-sm text-gray-500">{t.cost(item.cost)}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      {item.stock !== null &&
                        (outOfStock ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
                            {t.outOfStock}
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              item.stock <= 3 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {t.stockLeft(item.stock)}
                          </span>
                        ))}
                      {item.limitPerStudent !== null && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                          {t.limit(item.limitPerStudent, taken)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {item.grantsPet && petUnlocked ? (
                  <span className="shrink-0 self-start rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700">
                    {t.unlocked}
                  </span>
                ) : (
                  <RedeemButton
                    itemId={item.id}
                    canAfford={balance.balance >= item.cost}
                    blocked={outOfStock ? t.outOfStock : atLimit ? t.limitReached : null}
                  />
                )}
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <p className="text-gray-500">{t.noGifts}</p>
        )}
      </ul>

      <h2 className="mb-3 font-medium">{t.yourExchanges}</h2>
      <ul className="flex flex-col gap-2">
        {redemptions.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              {r.catalogueItem.name}
              {r.rejectedAt ? (
                <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                  {t.rejected}
                </span>
              ) : (
                !r.catalogueItem.grantsPet &&
                (r.deliveredAt ? (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    {t.delivered}
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {t.comingNext}
                  </span>
                ))
              )}
              {r.rejectedAt && r.rejectionReason && (
                <span className="mt-0.5 block text-xs text-rose-700">{t.reason(r.rejectionReason)}</span>
              )}
            </span>
            <span className={`text-xs ${r.rejectedAt ? "text-gray-300 line-through" : "text-gray-400"}`}>
              {t.spent(r.cost, r.createdAt.toLocaleDateString(dateLocale(lang)))}
            </span>
          </li>
        ))}
        {redemptions.length === 0 && (
          <p className="text-sm text-gray-500">{t.noExchanges}</p>
        )}
      </ul>
    </div>
  );
}

import { FEE_PLANS } from "@/lib/fee-plans";
import { rm } from "@/lib/fees";

/** The price list the receipts are worked out from - src/lib/fee-plans.ts. */
export default function PricesPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Prices</h1>
      <p className="mb-5 text-sm text-gray-600">
        The price depends on the grade and how many subjects are taken. Paying for the promotion&apos;s months at once
        gets the promotional price; longer periods repeat it, and any months left over are charged monthly.
      </p>
      <div className="flex flex-col gap-4">
        {FEE_PLANS.map((plan) => (
          <section key={plan.label} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <h2 className="bg-stone-100 px-4 py-2 font-semibold text-stone-900">{plan.label}</h2>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-2">Subjects</th>
                  <th className="px-4 py-2 text-right">Monthly</th>
                  <th className="px-4 py-2 text-right">Promotion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(plan.monthly).map(([n, sen]) => {
                  const promo = plan.promo[Number(n)];
                  const saves = promo ? promo.months * sen - promo.priceSen : 0;
                  return (
                    <tr key={n}>
                      <td className="px-4 py-2">
                        {n} subject{n === "1" ? "" : "s"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{rm(sen)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {promo ? (
                          <>
                            {rm(promo.priceSen)} for {promo.months} months
                            {saves <= 0 && (
                              <span className="block text-xs text-amber-700">
                                not cheaper than monthly ({rm(promo.months * sen)}), so not applied
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}

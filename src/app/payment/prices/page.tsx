import { prisma } from "@/lib/prisma";
import { BANDS } from "@/lib/fee-plans";
import { listExtraCharges, loadTaxRateBp } from "@/lib/fees.server";
import { AddExtraChargeForm, AddPriceRowForm, ExtraChargeRow, PriceRowForm, TaxRateForm } from "../price-forms";

/** The price list receipts are worked out from, edited here. */
export default async function PricesPage() {
  const [rows, extras, taxRateBp] = await Promise.all([
    prisma.feePrice.findMany({ orderBy: [{ band: "asc" }, { subjects: "asc" }] }),
    listExtraCharges(),
    loadTaxRateBp(),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Prices</h1>
      <p className="mb-5 text-sm text-gray-600">
        The price depends on the grade group and how many subjects are taken. Paying for a promotion&apos;s months at
        once gets the promotional price; longer periods repeat it, and any months left over are charged monthly. A
        promotion that is not cheaper than paying monthly is never applied. Changing a price affects new receipts only -
        receipts already made keep their amounts.
      </p>
      <div className="flex flex-col gap-4">
        {BANDS.map((band) => {
          const mine = rows.filter((r) => r.band === band.key);
          const next = mine.length ? Math.max(...mine.map((r) => r.subjects)) + 1 : 1;
          return (
            <section key={band.key} className="rounded-xl border border-gray-200 bg-white">
              <h2 className="rounded-t-xl bg-stone-100 px-4 py-2 font-semibold text-stone-900">
                {band.label}
                <span className="ml-2 text-xs font-normal text-gray-500">{band.grades.join(", ")}</span>
              </h2>
              <div className="flex flex-col gap-3 px-4 py-3">
                {mine.length === 0 && <p className="text-sm text-gray-500">No prices yet.</p>}
                {mine.map((r) => (
                  // Keyed on the saved values, so a save elsewhere refreshes the boxes.
                  <PriceRowForm
                    key={`${r.subjects}-${r.updatedAt.getTime()}`}
                    band={band.key}
                    subjects={r.subjects}
                    monthlySen={r.monthlySen}
                    promoMonths={r.promoMonths}
                    promoSen={r.promoSen}
                  />
                ))}
                <div className="border-t border-dashed border-gray-200 pt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">Add a price for more subjects</p>
                  <AddPriceRowForm key={next} band={band.key} nextSubjects={next} />
                </div>
              </div>
            </section>
          );
        })}

        <section className="rounded-xl border border-gray-200 bg-white">
          <h2 className="rounded-t-xl bg-stone-100 px-4 py-2 font-semibold text-stone-900">Extra charges</h2>
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs text-gray-500">
              Each is a box to tick on a new receipt, added once whatever the number of months, and printed as its own
              line. Removing one leaves receipts already made as they were.
            </p>
            {extras.length === 0 && <p className="text-sm text-gray-500">No extra charges.</p>}
            {extras.map((e) => (
              <ExtraChargeRow key={`${e.id}-${e.label}-${e.amountSen}`} id={e.id} label={e.label} amountSen={e.amountSen} />
            ))}
            <div className="border-t border-dashed border-gray-200 pt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Add a charge</p>
              <AddExtraChargeForm />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <h2 className="rounded-t-xl bg-stone-100 px-4 py-2 font-semibold text-stone-900">Tax rate</h2>
          <div className="px-4 py-3">
            <p className="mb-2 text-xs text-gray-500">
              The rate a new receipt starts with - it can be changed on each receipt. Tax is worked out on SUBTOTAL LESS
              DISCOUNT, as on the receipt template.
            </p>
            <TaxRateForm key={taxRateBp} rateBp={taxRateBp} />
          </div>
        </section>
      </div>
    </div>
  );
}

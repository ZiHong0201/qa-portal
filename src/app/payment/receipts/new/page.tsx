import Link from "next/link";
import { dayKey } from "@/lib/check-in";
import { GRADES } from "@/lib/fee-plans";
import { monthKey } from "@/lib/fees";
import { listExtraCharges, listFeeSubjects, loadFeePlans, loadTaxRateBp } from "@/lib/fees.server";
import { ReceiptBuilder } from "../../receipt-forms";

/**
 * A new receipt, for anyone: the name and email are typed in, not taken from
 * a portal account. Grades come from the price list and subjects from this
 * site's own Subjects page, so nothing here depends on the portal.
 */
export default async function NewReceiptPage() {
  const [subjects, plans, extras, taxRateBp] = await Promise.all([
    listFeeSubjects(),
    loadFeePlans(),
    listExtraCharges(),
    loadTaxRateBp(),
  ]);
  return (
    <div className="max-w-3xl">
      <Link href="/payment" className="text-sm text-teal-700 hover:underline">
        &larr; Receipts
      </Link>
      <h1 className="mt-1 mb-5 text-2xl font-bold text-stone-900">New receipt</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        {subjects.length === 0 ? (
          <p className="text-sm text-gray-600">
            Add the subjects a receipt can be for first, under{" "}
            <Link href="/payment/subjects" className="text-teal-700 underline">
              Subjects
            </Link>
            .
          </p>
        ) : (
          <ReceiptBuilder
            plans={plans}
            grades={GRADES}
            subjects={subjects.map((s) => s.name)}
            startMonth={monthKey()}
            today={dayKey()}
            extras={extras}
            defaultTaxRateBp={taxRateBp}
          />
        )}
      </div>
    </div>
  );
}

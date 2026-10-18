// YH Ideal tuition prices. Pure, so the receipt form can show the amount as
// the admin ticks, and the server works it out again from the same list
// before anything is saved.
//
// The price depends on the grade group and how many subjects are taken - not
// which ones - and paying for several months at once can earn a promotional
// price. The amounts are in the FeePrice table, edited on the Prices page;
// the grade groups are fixed here. Amounts are in sen.

export type Promotion = { months: number; priceSen: number };

export type Band = { key: string; label: string; grades: string[] };

export const BANDS: Band[] = [
  { key: "G6", label: "Grade 6", grades: ["Grade 6"] },
  { key: "F13", label: "Form 1 - Form 3", grades: ["Form 1", "Form 2", "Form 3"] },
  { key: "F45", label: "Form 4 - Form 5", grades: ["Form 4", "Form 5"] },
];

export const GRADES = BANDS.flatMap((b) => b.grades);

export type FeePlan = Band & {
  /** Monthly price by number of subjects. */
  monthly: Record<number, number>;
  /** Promotional price for paying `months` at once, by number of subjects. */
  promo: Record<number, Promotion>;
};

export type PriceRow = {
  band: string;
  subjects: number;
  monthlySen: number;
  promoMonths: number | null;
  promoSen: number | null;
};

/** The saved rows, shaped by grade group. */
export function buildPlans(rows: PriceRow[]): FeePlan[] {
  return BANDS.map((band) => {
    const mine = rows.filter((r) => r.band === band.key);
    return {
      ...band,
      monthly: Object.fromEntries(mine.map((r) => [r.subjects, r.monthlySen])),
      promo: Object.fromEntries(
        mine
          .filter((r) => r.promoMonths && r.promoSen)
          .map((r) => [r.subjects, { months: r.promoMonths!, priceSen: r.promoSen! }])
      ),
    };
  });
}

export const MAX_MONTHS = 12;

export function planFor(plans: FeePlan[], grade: string | null | undefined): FeePlan | null {
  return plans.find((p) => grade && p.grades.includes(grade)) ?? null;
}

export function maxSubjects(plan: FeePlan): number {
  const counts = Object.keys(plan.monthly).map(Number);
  return counts.length ? Math.max(...counts) : 0;
}

/** Whether a promotion actually saves money against paying monthly. */
export function promoSaves(promo: Promotion, monthlySen: number): boolean {
  return promo.priceSen < promo.months * monthlySen;
}

export type Quote = {
  monthlySen: number;
  /** Every month at the monthly price. */
  normalSen: number;
  /** What is charged, with any promotion applied. */
  amountSen: number;
  /** How the amount was reached, for the form and the receipt. */
  priceNote: string | null;
  promo: Promotion | null;
};

const ringgit = (sen: number) => `RM${(sen / 100).toFixed(sen % 100 ? 2 : 0)}`;

/**
 * The price for `subjects` subjects over `months` months.
 *
 * Each full block of the promotion's length is charged at the promotional
 * price, and any months left over at the monthly price: 6 months of a
 * 3-month offer is the offer twice. A promotion is only used where it is
 * actually cheaper than paying monthly for the same months, so nobody is
 * charged more for taking it.
 */
export function quote(
  plans: FeePlan[],
  grade: string | null | undefined,
  subjects: number,
  months: number
): Quote | { error: string } {
  const plan = planFor(plans, grade);
  if (!plan) return { error: `There is no fee set for ${grade || "a student with no grade"}.` };
  if (subjects < 1) return { error: "Tick at least one subject." };
  const monthlySen = plan.monthly[subjects];
  if (monthlySen === undefined) {
    const max = maxSubjects(plan);
    if (max === 0) return { error: `No prices are set for ${plan.label} yet.` };
    return {
      error:
        subjects > max
          ? `${plan.label} has a price for up to ${max} subject${max === 1 ? "" : "s"}. Untick ${subjects - max}.`
          : `${plan.label} has no price for ${subjects} subjects. Add it on the Prices page.`,
    };
  }
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    return { error: `Choose between 1 and ${MAX_MONTHS} months.` };
  }

  const normalSen = monthlySen * months;
  const offer = plan.promo[subjects];
  const worthIt = !!offer && promoSaves(offer, monthlySen);
  const blocks = worthIt ? Math.floor(months / offer.months) : 0;
  if (!offer || !worthIt || blocks === 0) {
    return { monthlySen, normalSen, amountSen: normalSen, priceNote: null, promo: worthIt ? offer : null };
  }

  const rest = months - blocks * offer.months;
  const amountSen = blocks * offer.priceSen + rest * monthlySen;
  const parts = [`${blocks > 1 ? `${blocks} x ` : ""}${offer.months}-month promotion (${ringgit(offer.priceSen)})`];
  if (rest) parts.push(`${rest} month${rest === 1 ? "" : "s"} at ${ringgit(monthlySen)}`);
  return { monthlySen, normalSen, amountSen, priceNote: parts.join(" + "), promo: offer };
}

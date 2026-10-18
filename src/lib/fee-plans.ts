// YH Ideal tuition prices. Pure, so the payment form can show the amount as
// the admin ticks, and the server works it out again from the same table
// before anything is saved.
//
// The price depends on the grade and how many subjects are taken - not which
// ones - and paying for several months at once can earn a promotional price.
// Change the numbers here when the prices change; amounts are in sen.

export type Promotion = { months: number; priceSen: number };

export type FeePlan = {
  label: string;
  grades: string[];
  /** Monthly price by number of subjects. */
  monthly: Record<number, number>;
  /** Promotional price for paying `months` at once, by number of subjects. */
  promo: Record<number, Promotion>;
};

export const FEE_PLANS: FeePlan[] = [
  {
    label: "Grade 6",
    grades: ["Grade 6"],
    monthly: { 1: 6500 },
    promo: { 1: { months: 6, priceSen: 39900 } },
  },
  {
    label: "Form 1 - Form 3",
    grades: ["Form 1", "Form 2", "Form 3"],
    monthly: { 1: 7000, 2: 14000, 3: 20500, 4: 26800 },
    promo: {
      1: { months: 6, priceSen: 39900 },
      2: { months: 3, priceSen: 39900 },
      3: { months: 3, priceSen: 59900 },
      4: { months: 3, priceSen: 78800 },
    },
  },
  {
    label: "Form 4 - Form 5",
    grades: ["Form 4", "Form 5"],
    monthly: { 1: 8000, 2: 15500, 3: 22000, 4: 28600, 5: 35500, 6: 41500 },
    promo: {
      1: { months: 6, priceSen: 45900 },
      2: { months: 3, priceSen: 45900 },
      3: { months: 3, priceSen: 64900 },
      4: { months: 3, priceSen: 84900 },
      5: { months: 3, priceSen: 105900 },
      6: { months: 3, priceSen: 123900 },
    },
  },
];

export const MAX_MONTHS = 12;

export function planFor(grade: string | null | undefined): FeePlan | null {
  return FEE_PLANS.find((p) => grade && p.grades.includes(grade)) ?? null;
}

export function maxSubjects(plan: FeePlan): number {
  return Math.max(...Object.keys(plan.monthly).map(Number));
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
export function quote(grade: string | null | undefined, subjects: number, months: number): Quote | { error: string } {
  const plan = planFor(grade);
  if (!plan) return { error: `There is no fee set for ${grade ?? "a student with no grade"}.` };
  if (subjects < 1) return { error: "Tick at least one subject." };
  const monthlySen = plan.monthly[subjects];
  if (monthlySen === undefined) {
    const max = maxSubjects(plan);
    return { error: `${plan.label} has a price for up to ${max} subject${max === 1 ? "" : "s"}. Untick ${subjects - max}.` };
  }
  if (!Number.isInteger(months) || months < 1 || months > MAX_MONTHS) {
    return { error: `Choose between 1 and ${MAX_MONTHS} months.` };
  }

  const normalSen = monthlySen * months;
  const offer = plan.promo[subjects];
  const worthIt = offer && offer.priceSen < offer.months * monthlySen;
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

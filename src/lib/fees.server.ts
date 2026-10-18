import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type BillLine,
  type BillStatus,
  type PaymentMethod,
  billStatus,
  billTotal,
  parseLines,
} from "@/lib/fees";

export type Result = { error?: string; success?: string };

/** A refusal raised inside a transaction, so it rolls back and is reported. */
class FeeRefused extends Error {}

function isUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  // libsql reports a unique conflict as P2039 rather than P2002.
  return error.code === "P2039" && /UNIQUE constraint failed/i.test(error.message);
}

// ---- what a student owes each month -----------------------------------------

/**
 * One line per enrolled subject that has a fee: the student's own rate where
 * one is set, the subject's usual fee otherwise. A subject with neither is
 * left off rather than billed at zero.
 */
export async function monthlyLinesFor(studentIds: string[]): Promise<Map<string, BillLine[]>> {
  const [enrolments, subjects, rates] = await Promise.all([
    prisma.studentSubject.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, subject: true },
      orderBy: { subject: "asc" },
    }),
    prisma.subject.findMany({ select: { name: true, monthlyFeeSen: true } }),
    prisma.studentFeeRate.findMany({ where: { studentId: { in: studentIds } } }),
  ]);
  const usual = new Map(subjects.map((s) => [s.name, s.monthlyFeeSen]));
  const own = new Map(rates.map((r) => [`${r.studentId}|${r.subject}`, r.monthlyFeeSen]));

  const lines = new Map<string, BillLine[]>(studentIds.map((id) => [id, []]));
  for (const e of enrolments) {
    const amountSen = own.get(`${e.studentId}|${e.subject}`) ?? usual.get(e.subject) ?? null;
    if (amountSen !== null) lines.get(e.studentId)!.push({ subject: e.subject, amountSen });
  }
  return lines;
}

/**
 * A bill for every student who has none for the month yet. A student whose
 * subjects carry no fee gets no bill, and is counted so the admin can see why.
 */
export async function createBillsForMonth(
  month: string,
  adminId: string
): Promise<{ created: number; noFee: number; existing: number }> {
  const [students, billed] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
    }),
    prisma.feeBill.findMany({ where: { month }, select: { studentId: true } }),
  ]);
  const already = new Set(billed.map((b) => b.studentId));
  const todo = students.filter((s) => !already.has(s.id));
  const lines = await monthlyLinesFor(todo.map((s) => s.id));

  const data = todo
    .filter((s) => lines.get(s.id)!.length > 0)
    .map((s) => ({
      studentId: s.id,
      studentName: s.name,
      grade: s.grade,
      month,
      lines: JSON.stringify(lines.get(s.id)),
      createdById: adminId,
    }));
  if (data.length) await prisma.feeBill.createMany({ data });

  return { created: data.length, noFee: todo.length - data.length, existing: already.size };
}

/** One student's bill for one month, made on its own - a student who joined mid-month. */
export async function createBill(studentId: string, month: string, adminId: string): Promise<Result> {
  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: { name: true, grade: true },
  });
  if (!student) return { error: "Student not found." };
  const lines = (await monthlyLinesFor([studentId])).get(studentId)!;
  if (lines.length === 0) {
    return { error: "None of this student's subjects has a fee yet. Set fees first." };
  }
  try {
    await prisma.feeBill.create({
      data: {
        studentId,
        studentName: student.name,
        grade: student.grade,
        month,
        lines: JSON.stringify(lines),
        createdById: adminId,
      },
    });
  } catch (e) {
    if (isUniqueConflict(e)) return { error: "This student already has a bill for that month." };
    throw e;
  }
  return { success: "Bill created." };
}

// ---- reading bills ----------------------------------------------------------

export type BillView = {
  id: string;
  studentId: string;
  studentName: string;
  grade: string | null;
  month: string;
  lines: BillLine[];
  adjustmentSen: number;
  note: string | null;
  totalSen: number;
  paidSen: number;
  balanceSen: number;
  status: BillStatus;
  payments: {
    id: string;
    amountSen: number;
    method: string;
    paidOn: string;
    receiptNo: string;
    note: string | null;
    voidedAt: Date | null;
    voidReason: string | null;
  }[];
};

export async function getBills(where: Prisma.FeeBillWhereInput): Promise<BillView[]> {
  const bills = await prisma.feeBill.findMany({
    where,
    orderBy: [{ month: "desc" }, { studentName: "asc" }],
    include: { payments: { orderBy: { createdAt: "asc" } } },
  });
  return bills.map((b) => {
    const totalSen = billTotal(b);
    // A voided payment stays on the record but no longer counts.
    const paidSen = b.payments.filter((p) => !p.voidedAt).reduce((s, p) => s + p.amountSen, 0);
    return {
      id: b.id,
      studentId: b.studentId,
      studentName: b.studentName,
      grade: b.grade,
      month: b.month,
      lines: parseLines(b.lines),
      adjustmentSen: b.adjustmentSen,
      note: b.note,
      totalSen,
      paidSen,
      balanceSen: totalSen - paidSen,
      status: billStatus(totalSen, paidSen),
      payments: b.payments.map((p) => ({
        id: p.id,
        amountSen: p.amountSen,
        method: p.method,
        paidOn: p.paidOn,
        receiptNo: p.receiptNo,
        note: p.note,
        voidedAt: p.voidedAt,
        voidReason: p.voidReason,
      })),
    };
  });
}

/** What each student still owes across every bill, for the student lists. */
export async function outstandingByStudent(): Promise<Map<string, number>> {
  const bills = await getBills({});
  const owed = new Map<string, number>();
  for (const b of bills) {
    if (b.balanceSen > 0) owed.set(b.studentId, (owed.get(b.studentId) ?? 0) + b.balanceSen);
  }
  return owed;
}

// ---- changing bills ---------------------------------------------------------

export async function adjustBill(billId: string, adjustmentSen: number, note: string | null): Promise<Result> {
  const bill = await prisma.feeBill.findUnique({
    where: { id: billId },
    include: { payments: { where: { voidedAt: null }, select: { amountSen: true } } },
  });
  if (!bill) return { error: "Bill not found." };
  const total = billTotal({ lines: bill.lines, adjustmentSen });
  if (total < 0) return { error: "The adjustment would make the bill less than zero." };
  const paid = bill.payments.reduce((s, p) => s + p.amountSen, 0);
  if (total < paid) {
    return { error: "More than that has already been paid. Void a payment first if it was wrong." };
  }
  await prisma.feeBill.update({ where: { id: billId }, data: { adjustmentSen, note } });
  return { success: "Bill updated." };
}

/** Only a bill nobody has paid anything towards - not even a voided payment. */
export async function deleteBill(billId: string): Promise<Result> {
  const count = await prisma.feePayment.count({ where: { billId } });
  if (count > 0) {
    return { error: "This bill has payments recorded against it, so it is kept. Adjust it instead." };
  }
  await prisma.feeBill.deleteMany({ where: { id: billId } });
  return { success: "Bill deleted." };
}

// ---- payments ---------------------------------------------------------------

export async function recordPayment(input: {
  billId: string;
  amountSen: number;
  method: PaymentMethod;
  paidOn: string;
  note: string | null;
  adminId: string;
}): Promise<Result & { paymentId?: string }> {
  if (input.amountSen <= 0) return { error: "Enter an amount above zero." };

  // The receipt number is the next in one running sequence. Two admins saving
  // at the same moment could pick the same one; the unique index refuses the
  // second, which then simply takes the number after.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const payment = await prisma.$transaction(async (tx) => {
        const bill = await tx.feeBill.findUnique({
          where: { id: input.billId },
          include: { payments: { where: { voidedAt: null }, select: { amountSen: true } } },
        });
        if (!bill) throw new FeeRefused("Bill not found.");
        const balance = billTotal(bill) - bill.payments.reduce((s, p) => s + p.amountSen, 0);
        if (balance <= 0) throw new FeeRefused("This bill is already fully paid.");
        if (input.amountSen > balance) {
          throw new FeeRefused(`That is more than the RM${(balance / 100).toFixed(2)} still owed on this bill.`);
        }
        const n = (await tx.feePayment.count()) + 1 + attempt;
        return tx.feePayment.create({
          data: {
            billId: bill.id,
            studentId: bill.studentId,
            amountSen: input.amountSen,
            method: input.method,
            paidOn: input.paidOn,
            receiptNo: `YH-${String(n).padStart(5, "0")}`,
            note: input.note,
            recordedById: input.adminId,
          },
        });
      });
      return { success: `Payment recorded - receipt ${payment.receiptNo}.`, paymentId: payment.id };
    } catch (e) {
      if (e instanceof FeeRefused) return { error: e.message };
      if (isUniqueConflict(e) && attempt < 2) continue;
      throw e;
    }
  }
  return { error: "Could not save the payment. Try again." };
}

export async function voidPayment(paymentId: string, reason: string, adminId: string): Promise<Result> {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Give a reason for voiding the payment." };
  if (trimmed.length > 300) return { error: "Keep the reason under 300 characters." };
  const { count } = await prisma.feePayment.updateMany({
    where: { id: paymentId, voidedAt: null },
    data: { voidedAt: new Date(), voidReason: trimmed, voidedById: adminId },
  });
  return count ? { success: "Payment voided." } : { error: "That payment is already voided." };
}

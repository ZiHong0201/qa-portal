import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";

/**
 * One student exchanging points for a gift.
 *
 * Kept apart from the server action that calls it so the action holds only
 * the who-is-asking checks (logged in, a student, not suspended) and this
 * holds the rules - which also lets the rules be tested on their own.
 */

/** A gift exchange turned down for a reason the student should be told. */
class ExchangeRefused extends Error {}

export type ExchangeResult = {
  error?: string;
  success?: string;
  /** True when this exchange unlocked the cat - the nav changes too. */
  unlockedPet?: boolean;
};

export async function exchangeGift(studentId: string, itemId: string): Promise<ExchangeResult> {
  const item = await prisma.catalogueItem.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) {
    return { error: "This item is no longer available." };
  }

  // Unlocking the cat is a one-off. Without this a student could pay for it
  // again and again, since there is nothing physical to hand over that would
  // make the duplicate obvious.
  if (item.grantsPet) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { petEnabled: true, pet: { select: { id: true } } },
    });
    if (student?.petEnabled || student?.pet) {
      return { error: "You have already unlocked the virtual cat." };
    }
  }

  // Everything that can say no is checked inside one transaction, after
  // the change it guards: the limit against this student's exchanges, the
  // stock taken only if any is left, and the balance read again after the
  // charge. Checking first and writing after would let two quick taps - or
  // two students after the last one - both pass the check; here the second
  // finds the first already counted, and the whole thing rolls back.
  try {
    await prisma.$transaction(async (tx) => {
      if (item.limitPerStudent !== null) {
        const already = await tx.redemption.count({
          // A rejected exchange does not use up the limit - the student
          // never got the gift, and may try again.
          where: { studentId: studentId, catalogueItemId: item.id, rejectedAt: null },
        });
        if (already >= item.limitPerStudent) {
          throw new ExchangeRefused(
            item.limitPerStudent === 1
              ? "You have already exchanged this gift - it is one per student."
              : `You have reached the limit of ${item.limitPerStudent} for this gift.`
          );
        }
      }

      if (item.stock !== null) {
        const taken = await tx.catalogueItem.updateMany({
          where: { id: item.id, stock: { gt: 0 } },
          data: { stock: { decrement: 1 } },
        });
        if (taken.count === 0) throw new ExchangeRefused("Sorry, this gift is out of stock.");
      }

      await tx.redemption.create({
        data: {
          studentId: studentId,
          catalogueItemId: item.id,
          cost: item.cost,
          // Unlocking the cat happens on the spot; there is nothing to hand
          // over, so it never joins the list of gifts to prepare.
          deliveredAt: item.grantsPet ? new Date() : null,
        },
      });

      const { balance } = await getStudentBalance(studentId, tx);
      if (balance < 0) throw new ExchangeRefused("You don't have enough points for this gift.");

      if (item.grantsPet) {
        await tx.user.update({
          where: { id: studentId },
          data: { petEnabled: true },
        });
      }
    });
  } catch (e) {
    if (e instanceof ExchangeRefused) return { error: e.message };
    throw e;
  }

  if (item.grantsPet) {
    return { success: `Unlocked! Head to "My Cat" to adopt your new friend.`, unlockedPet: true };
  }
  return {
    success: `Exchanged "${item.name}" for ${item.cost} points. It will be delivered with the next material delivery.`,
  };
}

/**
 * Turns down an exchange that has not been delivered - out of stock in
 * reality, a mistake, a gift withdrawn - and gives the student their points
 * back, with the reason shown to them.
 *
 * The points return by the exchange no longer counting as spent (see the
 * balance query), so there is no second record to write that could fail on
 * its own. In the same transaction the gift's stock, if counted, goes back up
 * by one. Only a pending exchange can be rejected: once a gift has been
 * handed over, taking the points back would be a different decision.
 */
export async function rejectExchange(
  redemptionId: string,
  reason: string,
  adminId: string
): Promise<{ error?: string }> {
  const why = reason.trim();
  if (!why) return { error: "Give a reason - the student will see it." };
  if (why.length > 300) return { error: "Keep the reason to 300 characters." };

  const done = await prisma.$transaction(async (tx) => {
    const marked = await tx.redemption.updateMany({
      where: { id: redemptionId, deliveredAt: null, rejectedAt: null },
      data: { rejectedAt: new Date(), rejectionReason: why, rejectedById: adminId },
    });
    if (marked.count === 0) return false;

    const r = await tx.redemption.findUnique({
      where: { id: redemptionId },
      select: { catalogueItemId: true },
    });
    await tx.catalogueItem.updateMany({
      where: { id: r!.catalogueItemId, stock: { not: null } },
      data: { stock: { increment: 1 } },
    });
    return true;
  });
  if (!done) return { error: "That exchange has already been delivered or rejected." };
  return {};
}

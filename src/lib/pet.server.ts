import { prisma } from "@/lib/prisma";
import { currentStats, moodOf, type Stats } from "@/lib/pet";
import { CLOTHING_ENABLED } from "@/lib/pet-art";

export type ShopItem = {
  id: string;
  key: string;
  name: string;
  kind: "CLOTHING" | "FOOD" | "SNACK";
  slot: string | null;
  cost: number;
  hungerEffect: number;
  happinessEffect: number;
  /** Clothing only: already bought, so the shop shows "Owned" not a price. */
  owned: boolean;
  equipped: boolean;
  /**
   * The PetOwnedItem row id, not this item's id - null until bought. Equipping
   * acts on the ownership row, so the two must not be confused: passing the
   * item id makes the ownership lookup miss and report "not yours".
   */
  ownedId: string | null;
};

export type PetView = {
  id: string;
  name: string;
  coat: string;
  stats: Stats;
  mood: ReturnType<typeof moodOf>;
  adoptedAt: Date;
  equippedKeys: string[];
  shop: ShopItem[];
};

/** Whether this student is allowed the cat at all. */
export async function petAccess(studentId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { petEnabled: true, role: true },
  });
  return !!user && user.role === "STUDENT" && user.petEnabled;
}

/**
 * The whole game screen in one round trip. Returns null when the student has
 * not adopted yet, which the page turns into the adoption screen.
 */
export async function getPetView(studentId: string): Promise<PetView | null> {
  const pet = await prisma.pet.findUnique({
    where: { ownerId: studentId },
    include: { owned: { include: { item: true } } },
  });
  if (!pet) return null;

  const items = await prisma.petItem.findMany({
    // Clothing is held back while the artwork changes over - owned rows are
    // untouched, so wardrobes survive and return when CLOTHING_ENABLED flips.
    where: { isActive: true, ...(CLOTHING_ENABLED ? {} : { kind: { not: "CLOTHING" } }) },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { cost: "asc" }],
  });

  const ownedByItemId = new Map(pet.owned.map((o) => [o.itemId, o]));
  const stats = currentStats(pet);

  return {
    id: pet.id,
    name: pet.name,
    coat: pet.coat,
    stats,
    mood: moodOf(stats, pet.name),
    adoptedAt: pet.adoptedAt,
    equippedKeys: pet.owned.filter((o) => o.equipped).map((o) => o.item.key),
    shop: items.map((item) => {
      const owned = ownedByItemId.get(item.id);
      return {
        id: item.id,
        key: item.key,
        name: item.name,
        kind: item.kind as ShopItem["kind"],
        slot: item.slot,
        cost: item.cost,
        hungerEffect: item.hungerEffect,
        happinessEffect: item.happinessEffect,
        owned: !!owned,
        equipped: !!owned?.equipped,
        ownedId: owned?.id ?? null,
      };
    }),
  };
}

/**
 * Just the look of a student's cat, for theming the decorative cats around
 * the portal. Returns null when they have not adopted one, which leaves every
 * one of those cats at its original grey.
 */
export async function getPetAppearance(
  studentId: string
): Promise<{ coat: string; equipped: string[] } | null> {
  const pet = await prisma.pet.findUnique({
    where: { ownerId: studentId },
    select: {
      coat: true,
      owned: { where: { equipped: true }, select: { item: { select: { key: true } } } },
    },
  });
  if (!pet) return null;
  return { coat: pet.coat, equipped: pet.owned.map((o) => o.item.key) };
}

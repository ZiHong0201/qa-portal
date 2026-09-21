import { prisma } from "@/lib/prisma";
import { currentStats, moodOf, type Stats } from "@/lib/pet";

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
    where: { isActive: true },
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

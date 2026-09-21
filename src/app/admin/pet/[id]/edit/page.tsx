import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PetItemForm } from "../../pet-item-form";
import { updatePetItem } from "@/lib/actions/pet-admin";

export default async function EditPetItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.petItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit shop item</h1>
      <PetItemForm
        action={updatePetItem.bind(null, item.id)}
        submitLabel="Save changes"
        initial={{
          name: item.name,
          kind: item.kind as "CLOTHING" | "FOOD" | "SNACK",
          key: item.key,
          cost: item.cost,
          hungerEffect: item.hungerEffect,
          happinessEffect: item.happinessEffect,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        }}
      />
    </div>
  );
}

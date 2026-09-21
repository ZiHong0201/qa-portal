import { PetItemForm } from "../pet-item-form";
import { createPetItem } from "@/lib/actions/pet-admin";

export default function NewPetItemPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New shop item</h1>
      <PetItemForm action={createPetItem} submitLabel="Create item" />
    </div>
  );
}

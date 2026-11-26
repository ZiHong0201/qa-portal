import { CatalogueForm } from "../catalogue-form";
import { createCatalogueItem } from "@/lib/actions/catalogue";
import { getCentres } from "@/lib/centres";

export default async function NewCatalogueItemPage() {
  const centres = await getCentres();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New gift</h1>
      <CatalogueForm action={createCatalogueItem} centres={centres} submitLabel="Create item" />
    </div>
  );
}

import { CatalogueForm } from "../catalogue-form";
import { createCatalogueItem } from "@/lib/actions/catalogue";

export default function NewCatalogueItemPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New catalogue item</h1>
      <CatalogueForm action={createCatalogueItem} submitLabel="Create item" />
    </div>
  );
}

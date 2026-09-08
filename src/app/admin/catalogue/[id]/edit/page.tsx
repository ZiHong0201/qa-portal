import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CatalogueForm } from "../../catalogue-form";
import { updateCatalogueItem } from "@/lib/actions/catalogue";

export default async function EditCatalogueItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.catalogueItem.findUnique({ where: { id } });
  if (!item) notFound();

  const action = updateCatalogueItem.bind(null, item.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit catalogue item</h1>
      <CatalogueForm
        action={action}
        submitLabel="Save changes"
        initial={{
          name: item.name,
          description: item.description,
          cost: item.cost,
          imageUrl: item.imageUrl,
        }}
      />
    </div>
  );
}

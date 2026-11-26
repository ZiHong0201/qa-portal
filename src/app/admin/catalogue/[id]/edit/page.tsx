import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CatalogueForm } from "../../catalogue-form";
import { updateCatalogueItem } from "@/lib/actions/catalogue";
import { getCentres } from "@/lib/centres";

export default async function EditCatalogueItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, centres] = await Promise.all([
    prisma.catalogueItem.findUnique({ where: { id }, include: { centres: true } }),
    getCentres(),
  ]);
  if (!item) notFound();

  const action = updateCatalogueItem.bind(null, item.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit gift</h1>
      <CatalogueForm
        action={action}
        submitLabel="Save changes"
        centres={centres}
        initial={{
          name: item.name,
          description: item.description,
          cost: item.cost,
          imageUrl: item.imageUrl,
          stock: item.stock,
          limitPerStudent: item.limitPerStudent,
          centreIds: item.centres.map((c) => c.centreId),
        }}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PopupForm } from "../../../popup-form";
import { updatePopupAd } from "@/lib/actions/announcements";
import { dateToLocalInput } from "@/lib/announcements";
import { getCentres } from "@/lib/centres";

export default async function EditPopupAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ad, centres] = await Promise.all([
    prisma.popupAd.findUnique({ where: { id }, include: { centres: true } }),
    getCentres(),
  ]);
  if (!ad) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit pop-up ad</h1>
      <PopupForm
        action={updatePopupAd.bind(null, ad.id)}
        submitLabel="Save changes"
        centres={centres}
        initial={{
          title: ad.title ?? "",
          linkUrl: ad.linkUrl ?? "",
          imageUrl: ad.imageUrl,
          startsAt: dateToLocalInput(ad.startsAt),
          endsAt: dateToLocalInput(ad.endsAt),
          isActive: ad.isActive,
          centreIds: ad.centres.map((c) => c.centreId),
        }}
      />
    </div>
  );
}

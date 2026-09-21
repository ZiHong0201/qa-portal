import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PopupForm } from "../../../popup-form";
import { updatePopupAd } from "@/lib/actions/announcements";
import { dateToLocalInput } from "@/lib/announcements";

export default async function EditPopupAdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ad = await prisma.popupAd.findUnique({ where: { id } });
  if (!ad) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit pop-up ad</h1>
      <PopupForm
        action={updatePopupAd.bind(null, ad.id)}
        submitLabel="Save changes"
        initial={{
          title: ad.title ?? "",
          linkUrl: ad.linkUrl ?? "",
          imageUrl: ad.imageUrl,
          startsAt: dateToLocalInput(ad.startsAt),
          endsAt: dateToLocalInput(ad.endsAt),
          isActive: ad.isActive,
        }}
      />
    </div>
  );
}

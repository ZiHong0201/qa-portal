import { PopupForm } from "../../popup-form";
import { createPopupAd } from "@/lib/actions/announcements";
import { getCentres } from "@/lib/centres";

export default async function NewPopupAdPage() {
  const centres = await getCentres();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New pop-up ad</h1>
      <PopupForm action={createPopupAd} centres={centres} submitLabel="Create pop-up" />
    </div>
  );
}

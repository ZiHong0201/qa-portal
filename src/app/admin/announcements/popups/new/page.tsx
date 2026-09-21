import { PopupForm } from "../../popup-form";
import { createPopupAd } from "@/lib/actions/announcements";

export default function NewPopupAdPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New pop-up ad</h1>
      <PopupForm action={createPopupAd} submitLabel="Create pop-up" />
    </div>
  );
}

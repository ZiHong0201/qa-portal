import Link from "next/link";
import { notFound } from "next/navigation";
import { getReceipt } from "@/lib/fees.server";
import { RECEIPT_COPY_TO, mailSettingsCheck } from "@/lib/mailer";
import { ReceiptCard } from "../../receipt-card";
import { ResendReceiptButton, VoidReceiptButton } from "../../receipt-forms";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; unsent?: string }>;
}) {
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const receipt = await getReceipt(id);
  if (!receipt) notFound();

  const sentOn = receipt.sentAt?.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/payment" className="text-sm text-teal-700 hover:underline">
          &larr; Receipts
        </Link>
        <PrintButton />
      </div>

      {flags.sent && receipt.sentAt && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
          Sent to {receipt.email}, with a copy to {RECEIPT_COPY_TO}.
        </p>
      )}
      {!receipt.sentAt && !receipt.voidedAt && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          <p>
            {flags.unsent ? "The receipt is saved, but the email did not go." : "This receipt has not been emailed."}
            {receipt.sendError && <span className="block text-xs">{receipt.sendError}</span>}
          </p>
          {/Invalid login|Username and Password/i.test(receipt.sendError ?? "") && <LoginCheck />}
          <div className="mt-2">
            <ResendReceiptButton id={receipt.id} label="Send again" />
          </div>
        </div>
      )}

      <ReceiptCard receipt={receipt} voided={receipt.voidedAt ? receipt.voidReason : null} />

      <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 print:hidden">
        {sentOn && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Emailed {sentOn} to {receipt.email}
            </span>
            {!receipt.voidedAt && <ResendReceiptButton id={receipt.id} label="Send again" />}
          </div>
        )}
        {!receipt.voidedAt && <VoidReceiptButton id={receipt.id} receiptNo={receipt.receiptNo} />}
      </div>
    </div>
  );
}

/** When Gmail refuses the login: what the server is signing in with, minus the password. */
function LoginCheck() {
  const { user, passwordLength } = mailSettingsCheck();
  return (
    <ul className="mt-2 list-disc pl-5 text-xs">
      <li>
        Sending from: <strong>{user || "(GMAIL_USER is empty)"}</strong> - the App Password must be made while signed in
        to exactly this account.
      </li>
      <li>
        App Password: <strong>{passwordLength} letters</strong>
        {passwordLength === 16 ? " - the right length." : " - an App Password has 16, so this is not one."}
      </li>
    </ul>
  );
}

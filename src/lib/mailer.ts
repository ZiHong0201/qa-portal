import nodemailer, { type Transporter } from "nodemailer";
import { PAYMENT_SITE_NAME } from "@/lib/fees";

/**
 * Email, sent from a Gmail account with an App Password. Both are set as
 * environment variables on the Vercel project and never kept in the code:
 *
 *   GMAIL_USER          the Gmail address receipts are sent from
 *   GMAIL_APP_PASSWORD  a 16-letter App Password made for it in the Google
 *                       account (Security > 2-Step Verification > App passwords)
 *
 * Every receipt also goes, as a blind copy, to RECEIPT_COPY_TO.
 */
export const RECEIPT_COPY_TO = process.env.RECEIPT_COPY_TO || "mrzhaosejarah@gmail.com";

export function mailConfigured(): boolean {
  return !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD;
}

/**
 * What the server will sign in to Gmail with, for when a login is refused: the
 * address, and only the length of the App Password - which should be 16 -
 * never the password itself.
 */
export function mailSettingsCheck(): { user: string; passwordLength: number } {
  return {
    user: (process.env.GMAIL_USER ?? "").trim(),
    passwordLength: appPassword().length,
  };
}

/**
 * The App Password as Gmail wants it: 16 letters. Google displays it in four
 * groups ("abcd efgh ijkl mnop"), and it tends to be pasted into Vercel with
 * those spaces, or wrapped in quotes as if it were code - neither belongs to it.
 */
function appPassword(): string {
  return (process.env.GMAIL_APP_PASSWORD ?? "").replace(/[\s"'\u201C\u201D\u2018\u2019]/g, "");
}

let transport: Transporter | null = null;

/** For tests: send through a stand-in instead of Gmail. */
export function setTransportForTests(t: Transporter | null) {
  transport = t;
}

export async function sendMail(mail: { to: string; bcc?: string; subject: string; html: string; text: string }) {
  if (!transport && !mailConfigured()) {
    throw new Error("Email is not set up yet: GMAIL_USER and GMAIL_APP_PASSWORD are missing on the server.");
  }
  const user = (process.env.GMAIL_USER ?? "").trim();
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword() },
  });
  await transport.sendMail({
    from: { name: PAYMENT_SITE_NAME, address: user || "receipts@example.invalid" },
    ...mail,
  });
}

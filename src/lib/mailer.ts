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
    passwordLength: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "").length,
  };
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
  // Google shows an App Password as four groups of four ("abcd efgh ijkl
  // mnop"), and the spaces tend to come along when it is pasted into Vercel.
  const user = (process.env.GMAIL_USER ?? "").trim();
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "") },
  });
  await transport.sendMail({
    from: { name: PAYMENT_SITE_NAME, address: user || "receipts@example.invalid" },
    ...mail,
  });
}

import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { PORTAL_ORIGIN, isPaymentHost } from "@/lib/fees";

export type Result = { error?: string; success?: string };

export const MIN_PASSWORD = 8;
const RESET_LINK_MINUTES = 60;
/** Requests per account per hour; more are quietly not sent. */
const RESETS_PER_HOUR = 3;
const SITE_NAME = "Mr Tan Exercise Portal";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function checkNew(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `The new password needs at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  if (password !== confirm) return "The two new passwords do not match.";
  return null;
}

// ---- changing it while logged in --------------------------------------------

export async function changePassword(
  userId: string,
  current: string,
  password: string,
  confirm: string
): Promise<Result> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) return { error: "Account not found." };
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "The current password is not right." };
  const problem = checkNew(password, confirm);
  if (problem) return { error: problem };
  if (await bcrypt.compare(password, user.passwordHash)) {
    return { error: "That is the password you have now. Choose a different one." };
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  // A reset link asked for earlier should not still work afterwards.
  await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  return { success: "Password changed. Use the new one next time you log in." };
}

// ---- forgot password ----------------------------------------------------------

/**
 * Where the link in the email points: the site the request came from, if it is
 * one of ours. Anything else falls back to the portal - a forged Host header
 * must never be able to point a reset link at someone else's site.
 */
export function resetLinkOrigin(host: string | null, proto: string | null): string {
  const name = (host ?? "").split(":")[0];
  const ours =
    /^qa-portal[a-z0-9-]*\.vercel\.app$/.test(name) ||
    isPaymentHost(host) ||
    name === "localhost" ||
    name.endsWith(".localhost");
  if (!host || !ours) return PORTAL_ORIGIN;
  const scheme = name === "localhost" || name.endsWith(".localhost") ? (proto ?? "http") : "https";
  return `${scheme}://${host}`;
}

/**
 * Emails a reset link to the account with this address, if there is one.
 * Says nothing either way: the page tells everyone the same thing, so it
 * cannot be used to find out who has an account.
 */
export async function requestPasswordReset(emailInput: string, origin: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= RESETS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Only the newest link works.
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const link = `${origin}/reset-password?token=${token}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  try {
    await sendMail({
      to: user.email,
      fromName: SITE_NAME,
      subject: "Reset your password",
      text: [
        `Hi ${user.name},`,
        "",
        "Someone asked to reset the password for your account. To choose a new one, open this link:",
        link,
        "",
        `The link works once and expires in ${RESET_LINK_MINUTES} minutes. If you did not ask for this, ignore this email - your password stays as it is.`,
      ].join("\n"),
      html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px">
<tr><td style="padding:24px">
  <p style="margin:0 0 12px">Hi ${esc(user.name)},</p>
  <p style="margin:0 0 16px">Someone asked to reset the password for your account. To choose a new one:</p>
  <p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Reset my password</a></p>
  <p style="margin:0 0 16px;font-size:12px;color:#555">Or copy this link into your browser:<br><span style="word-break:break-all">${link}</span></p>
  <p style="margin:0;font-size:12px;color:#555">The link works once and expires in ${RESET_LINK_MINUTES} minutes. If you did not ask for this, ignore this email - your password stays as it is.</p>
</td></tr></table></body></html>`,
    });
  } catch (e) {
    // Logged for the admin, not shown: the page says the same thing regardless.
    console.error("password reset email failed:", e instanceof Error ? e.message : e);
  }
}

/** Whether a link can still be used - to show the form, or say why not. */
export async function checkResetToken(token: string): Promise<"ok" | "invalid" | "expired" | "used"> {
  if (!token) return "invalid";
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt < new Date()) return "expired";
  return "ok";
}

export async function resetPassword(token: string, password: string, confirm: string): Promise<Result> {
  const problem = checkNew(password, confirm);
  if (problem) return { error: problem };
  const state = await checkResetToken(token);
  if (state === "used") return { error: "This link has already been used. Ask for a new one." };
  if (state === "expired") return { error: "This link has expired. Ask for a new one." };
  if (state !== "ok") return { error: "This link is not valid. Ask for a new one." };

  const passwordHash = await bcrypt.hash(password, 10);
  // Spending the token and setting the password together, and only if the
  // token is still unspent - two clicks at once cannot both succeed.
  const done = await prisma.$transaction(async (tx) => {
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!row) return false;
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!count) return false;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: new Date() } });
    return true;
  });
  return done
    ? { success: "Your password has been changed. You can log in with it now." }
    : { error: "This link has already been used. Ask for a new one." };
}

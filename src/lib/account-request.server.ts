import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mailConfigured, sendMail } from "@/lib/mailer";
import type { Result } from "@/lib/password.server";
import type { UiLang } from "@/lib/i18n";
import { authText } from "@/lib/text/auth";

const SITE_NAME = "Mr Tan Exercise Portal";
/** Waiting requests at once; past this the form quietly stops taking more. */
const MAX_PENDING = 100;
// No 0/O, 1/l/I: the password is read off an email and typed in by hand.
const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_LENGTH = 10;

// One schema per language, so its messages come back in the visitor's.
const requestSchemaIn = (t: (typeof authText)[UiLang]) =>
  z.object({
    name: z.string().trim().min(1, t.enterName).max(100, t.nameTooLong),
    email: z.string().trim().toLowerCase().email(t.validEmail),
  });
const requestSchemas = { en: requestSchemaIn(authText.en), zh: requestSchemaIn(authText.zh) };

/**
 * Records a request for a student account. The answer is the same whether
 * the email is new, already waiting, or already has an account, so the form
 * cannot be used to find out who studies here. Messages are in `lang`,
 * English unless told otherwise.
 */
export async function requestAccount(nameInput: string, emailInput: string, lang: UiLang = "en"): Promise<Result> {
  const parsed = requestSchemas[lang].safeParse({ name: nameInput, email: emailInput });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;

  const [user, pending] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.accountRequest.count(),
  ]);
  if (!user && pending < MAX_PENDING) {
    // Asking twice keeps the first request rather than failing on the unique email.
    await prisma.accountRequest.upsert({ where: { email }, create: { name, email }, update: {} });
  }
  return { success: authText[lang].requestSent };
}

export function generatePassword(): string {
  let out = "";
  for (let i = 0; i < PASSWORD_LENGTH; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

const approveSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  grade: z.string().trim().min(1, "Select a grade."),
  subjects: z.array(z.string().trim().min(1)).min(1, "Select at least one subject."),
});

/**
 * Turns a request into a student account with a random password, and emails
 * that password with a link to the portal. If the email cannot be sent the
 * account is taken back out and the request left waiting - an account whose
 * password nobody knows is no use to anyone.
 */
export async function approveAccountRequest(
  requestId: string,
  input: { name: unknown; grade: unknown; subjects: unknown[] },
  portalOrigin: string
): Promise<Result> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, grade, subjects } = parsed.data;

  if (!mailConfigured()) {
    return { error: "Email is not set up on the server (GMAIL_USER and GMAIL_APP_PASSWORD), so the password cannot be sent." };
  }

  const request = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "This request has already been dealt with." };

  const [existing, gradeExists, subjectCount] = await Promise.all([
    prisma.user.findUnique({ where: { email: request.email }, select: { id: true } }),
    prisma.grade.findUnique({ where: { name: grade } }),
    prisma.subject.count({ where: { name: { in: subjects } } }),
  ]);
  if (existing) return { error: "An account with this email already exists. Reject the request instead." };
  if (!gradeExists) return { error: "Select a valid grade." };
  if (subjectCount !== subjects.length) return { error: "Select valid subjects." };

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  let studentId: string;
  try {
    studentId = await prisma.$transaction(async (tx) => {
      // Deleting first means two approvals at once cannot both get through.
      const { count } = await tx.accountRequest.deleteMany({ where: { id: request.id } });
      if (!count) throw new Error("gone");
      const student = await tx.user.create({
        data: {
          name,
          email: request.email,
          passwordHash,
          role: "STUDENT",
          grade,
          subjects: { create: subjects.map((subject) => ({ subject })) },
        },
        select: { id: true },
      });
      return student.id;
    });
  } catch {
    return { error: "This request has already been dealt with." };
  }

  try {
    await sendAccountEmail(request.email, name, password, portalOrigin);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error("account approval email failed:", why);
    await prisma.$transaction([
      prisma.studentSubject.deleteMany({ where: { studentId } }),
      prisma.user.delete({ where: { id: studentId } }),
      prisma.accountRequest.create({ data: { name: request.name, email: request.email, createdAt: request.createdAt } }),
    ]);
    return { error: `The email could not be sent, so no account was made: ${why}` };
  }

  return { success: `Account created for ${name}. Their password has been emailed to ${request.email}.` };
}

export async function rejectAccountRequest(requestId: string): Promise<void> {
  await prisma.accountRequest.deleteMany({ where: { id: requestId } });
}

async function sendAccountEmail(to: string, name: string, password: string, origin: string) {
  const link = `${origin}/login`;
  const changeLink = `${origin}/account/password`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await sendMail({
    to,
    fromName: SITE_NAME,
    subject: "Your account is ready",
    text: [
      `Hi ${name},`,
      "",
      `Your account on ${SITE_NAME} has been approved. Log in with:`,
      "",
      `Email: ${to}`,
      `Password: ${password}`,
      "",
      `Portal: ${link}`,
      "",
      `This password was made up by the computer. Please change it to your own as soon as you log in: open your name at the top of the page, or go to ${changeLink}.`,
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px">
<tr><td style="padding:24px">
  <p style="margin:0 0 12px">Hi ${esc(name)},</p>
  <p style="margin:0 0 16px">Your account on ${SITE_NAME} has been approved. Log in with:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f5f5f4;border-radius:8px">
    <tr><td style="padding:10px 14px 4px;color:#555">Email</td><td style="padding:10px 14px 4px">${esc(to)}</td></tr>
    <tr><td style="padding:4px 14px 10px;color:#555">Password</td><td style="padding:4px 14px 10px;font-family:Consolas,Menlo,monospace;font-size:16px;font-weight:bold;letter-spacing:1px">${esc(password)}</td></tr>
  </table>
  <p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Open the portal</a></p>
  <p style="margin:0 0 16px;font-size:12px;color:#555">Or copy this link into your browser:<br><span style="word-break:break-all">${link}</span></p>
  <p style="margin:0;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#78350f"><b>Please change this password</b> to your own as soon as you log in: open your name at the top of the page, or go to <a href="${changeLink}" style="color:#0369a1">${changeLink}</a>.</p>
</td></tr></table></body></html>`,
  });
}

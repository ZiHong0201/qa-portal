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
export async function requestAccount(
  nameInput: string,
  emailInput: string,
  lang: UiLang = "en",
  /** The centre they attend. Required once any centre exists. */
  centreInput = ""
): Promise<Result> {
  const parsed = requestSchemas[lang].safeParse({ name: nameInput, email: emailInput });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email } = parsed.data;

  const [user, pending, centre, centreCount] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.accountRequest.count(),
    centreInput ? prisma.centre.findUnique({ where: { id: centreInput }, select: { id: true } }) : null,
    prisma.centre.count(),
  ]);
  if (centreCount > 0 && !centre) return { error: authText[lang].selectCentre };
  const centreId = centre?.id ?? null;
  if (!user && pending < MAX_PENDING) {
    // Asking twice keeps the first request rather than failing on the unique email.
    await prisma.accountRequest.upsert({ where: { email }, create: { name, email, centreId }, update: {} });
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
  /** centreId is checked against the approver's own centres by the caller. */
  input: { name: unknown; grade: unknown; subjects: unknown[]; centreId: string | null },
  portalOrigin: string
): Promise<Result> {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, grade, subjects } = parsed.data;
  const { centreId } = input;

  if (!mailConfigured()) {
    return { error: "Email is not set up on the server (GMAIL_USER and GMAIL_APP_PASSWORD), so the password cannot be sent." };
  }

  const request = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!request) return { error: "This request has already been dealt with." };

  const [existing, gradeExists, subjectCount, centreExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: request.email }, select: { id: true } }),
    prisma.grade.findUnique({ where: { name: grade } }),
    prisma.subject.count({ where: { name: { in: subjects } } }),
    centreId ? prisma.centre.findUnique({ where: { id: centreId }, select: { id: true } }) : true,
  ]);
  if (existing) return { error: "An account with this email already exists. Reject the request instead." };
  if (!centreExists) return { error: "Select a valid centre." };
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
          centreId,
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
    await sendAccountEmail(request.email, name, password, portalOrigin, request.createdAt);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error("account approval email failed:", why);
    await prisma.$transaction([
      prisma.studentSubject.deleteMany({ where: { studentId } }),
      prisma.user.delete({ where: { id: studentId } }),
      prisma.accountRequest.create({
        data: { name: request.name, email: request.email, createdAt: request.createdAt, centreId: request.centreId },
      }),
    ]);
    return { error: `The email could not be sent, so no account was made: ${why}` };
  }

  return { success: `Account created for ${name}. Their password has been emailed to ${request.email}.` };
}

export async function rejectAccountRequest(requestId: string): Promise<void> {
  await prisma.accountRequest.deleteMany({ where: { id: requestId } });
}

/**
 * The email with the new password. Written to look like a note from a person
 * rather than a sign-up template: a password plus a big "log in" button in a
 * styled card is what phishing looks like, and spam filters treat it so. So
 * the layout is plain paragraphs, the student's name is in the subject, the
 * link is shown as the address it goes to, and it says when they asked.
 */
async function sendAccountEmail(to: string, name: string, password: string, origin: string, askedAt: Date) {
  const link = `${origin}/login`;
  const changeLink = `${origin}/account`;
  const asked = askedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Kuala_Lumpur" });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;
  await sendMail({
    to,
    fromName: SITE_NAME,
    subject: `${name}, your ${SITE_NAME} account`,
    text: [
      `Hi ${name},`,
      "",
      `You asked for an account on ${SITE_NAME} on ${asked}. Mr Tan has set it up for you.`,
      "",
      `Log in at: ${link}`,
      `Email: ${to}`,
      `Password: ${password}`,
      "",
      `Please change this password to one of your own after you log in: click your name at the top of the page, or go to ${changeLink}`,
      "",
      "If you did not ask for this account, you can ignore this email.",
      "",
      SITE_NAME,
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">
${p(`Hi ${esc(name)},`)}
${p(`You asked for an account on ${SITE_NAME} on ${esc(asked)}. Mr Tan has set it up for you.`)}
${p(`Log in at: <a href="${esc(link)}">${esc(link)}</a><br>Email: ${esc(to)}<br>Password: <span style="font-family:Consolas,Menlo,monospace">${esc(password)}</span>`)}
${p(`Please change this password to one of your own after you log in: click your name at the top of the page, or go to <a href="${esc(changeLink)}">${esc(changeLink)}</a>`)}
${p("If you did not ask for this account, you can ignore this email.")}
<p style="margin:0">${SITE_NAME}</p>
</body></html>`,
  });
}

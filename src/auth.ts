import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

/**
 * How long a session may go on trusting the role it was given before the
 * account is read again.
 *
 * The session is a signed cookie, not a database row, so without this the
 * role chosen at login would be the role for good: a teacher whose access an
 * admin revokes - or whose account is deleted outright - would keep every
 * staff page and action until they happened to log out. Re-reading on every
 * call would cost a query each time auth() runs, several times per page;
 * a minute bounds how long a revoked account lingers without that.
 */
const ACCOUNT_RECHECK_MS = 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.checkedAt = Date.now();
        return token;
      }
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (Date.now() - checkedAt < ACCOUNT_RECHECK_MS) return token;

      const current = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true, name: true },
      });
      // A deleted account is signed out: returning null ends the session.
      if (!current) return null;
      // Picks up a demotion, a promotion, and a rename alike.
      token.role = current.role;
      token.name = current.name;
      token.checkedAt = Date.now();
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});

import { createClient, type Client } from "@libsql/client";

/**
 * A database client for the live quiz's public endpoints, separate from
 * Prisma's.
 *
 * Prisma's libsql adapter wraps every query in a mutex, so one server process
 * runs its queries strictly one after another. For most of the portal that is
 * survivable. For a live game it is not: a hundred phones joining in a burst,
 * or answering in the same eight seconds, need dozens of queries a second,
 * and under the lock they queue - measured locally at 15 seconds per poll
 * with 100 players. This client has no lock, so those queries overlap.
 *
 * It talks HTTPS rather than the WebSocket that a libsql:// address selects:
 * every query is its own request, which is what lets them run side by side,
 * and a single query measured about three times faster that way.
 *
 * Writes from here must match what Prisma writes, because the host's screen
 * reads the same rows through Prisma: dates as ISO text with a "+00:00"
 * suffix (see isoNow) and booleans as 0 or 1.
 */

let client: Client | null = null;

export function liveDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL!.replace(/^libsql:\/\//, "https://");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

/** The current time in exactly the text form Prisma stores DateTime columns. */
export function isoNow(): string {
  return new Date().toISOString().replace("Z", "+00:00");
}

/** True when a write was refused by a UNIQUE index. */
export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code ?? "";
  return code === "SQLITE_CONSTRAINT_UNIQUE" || /UNIQUE constraint failed/i.test(error.message);
}

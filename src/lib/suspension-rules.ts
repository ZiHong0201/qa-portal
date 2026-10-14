// Shared by the admin form and the server action. Kept apart from both: a
// "use server" file may only export async functions, and suspension.ts pulls
// in the database client, which must not reach the browser.
export const SUSPENSION_REASON_MAX = 300;

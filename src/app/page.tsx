import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">
        ZHAcademy
        <br />
        Exercise Portal
      </h1>
      <p className="text-lg text-gray-600">
        Answer questions, earn credit, and track your progress.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-black px-5 py-2.5 text-white hover:bg-gray-800"
      >
        Log in
      </Link>
    </main>
  );
}

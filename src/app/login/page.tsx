import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-1 flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}

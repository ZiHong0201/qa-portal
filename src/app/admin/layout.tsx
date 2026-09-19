import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { PwaRegister } from "@/components/pwa-register";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-screen-2xl px-4 py-8">
        <PwaRegister />
        {children}
      </div>
    </div>
  );
}

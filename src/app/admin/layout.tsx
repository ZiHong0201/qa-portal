import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { PwaRegister } from "@/components/pwa-register";

// The manifest and app icons are declared here rather than in the root layout
// on purpose: a browser only offers to install a site whose page links a
// manifest, so keeping it inside /admin means the install option exists for
// admins and never appears on the student side. Move this to the root layout
// when the portal should be installable by students too.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mr Tan Admin",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

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

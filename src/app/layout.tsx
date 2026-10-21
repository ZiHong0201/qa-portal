import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa";
import { UiLangProvider } from "@/components/ui-language";
import { getUiLang } from "@/lib/i18n.server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mr Tan – Exercise Portal",
  description: "Answer questions and earn credit.",
  // Declared at the root so the portal is installable for students and
  // admins alike. start_url is "/", which redirects by role, so each of them
  // opens the app on their own home page.
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mr Tan", statusBarStyle: "default" },
  // Both listed explicitly: declaring an `icons` object at all stops Next
  // auto-emitting the link for a file-based src/app/icon.png, so the tab icon
  // has to be named here too or the browser falls back to nothing.
  icons: {
    icon: [{ url: "/icons/icon-192.png", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getUiLang();
  return (
    <html
      lang={lang === "zh" ? "zh-Hans" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <UiLangProvider lang={lang}>{children}</UiLangProvider>
      </body>
    </html>
  );
}

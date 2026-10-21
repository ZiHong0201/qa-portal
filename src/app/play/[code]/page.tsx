import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUiLang } from "@/lib/i18n.server";
import { liveText } from "@/lib/text/live";
import { PlayClient } from "./play-client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: liveText[await getUiLang()].metaLive };
}

/** A game, reached by scanning the host's QR code or typing its code. Public. */
export default async function PlayCodePage({ params }: PageProps<"/play/[code]">) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) notFound();
  return <PlayClient code={code} />;
}

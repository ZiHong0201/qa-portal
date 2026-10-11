import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayClient } from "./play-client";

export const metadata: Metadata = { title: "Live quiz – Mr Tan" };

/** A game, reached by scanning the host's QR code or typing its code. Public. */
export default async function PlayCodePage({ params }: PageProps<"/play/[code]">) {
  const { code } = await params;
  if (!/^\d{6}$/.test(code)) notFound();
  return <PlayClient code={code} />;
}

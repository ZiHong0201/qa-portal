import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { HostScreen } from "./host-screen";

/**
 * The host's screen for one game - meant for the projector.
 *
 * The join link is built from the address this page was requested on, so the
 * QR code points at whatever domain the host is using without any setting to
 * keep in step. (Run locally, that is localhost, which a phone cannot reach;
 * on the deployed site it is the public address.)
 */
export default async function LiveHostPage({ params }: PageProps<"/admin/live/[id]">) {
  const { id } = await params;
  const quiz = await prisma.liveQuiz.findUnique({
    where: { id },
    select: { id: true, code: true, title: true, secondsPerQuestion: true },
  });
  if (!quiz) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const joinUrl = `${proto}://${host}/play/${quiz.code}`;

  // Our own SVG, generated from our own URL - safe to inline.
  const qrSvg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0c1e3e", light: "#ffffff" },
  });

  return (
    <HostScreen
      quizId={quiz.id}
      code={quiz.code}
      joinHost={`${host}/play`}
      qrSvg={qrSvg}
    />
  );
}

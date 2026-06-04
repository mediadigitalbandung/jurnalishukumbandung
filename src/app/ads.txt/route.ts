import { NextResponse } from "next/server";

// Disajikan di /ads.txt. Wajib AdSense — tanpa ini Google menandai "Earnings at risk".
// Sumber tunggal: NEXT_PUBLIC_ADSENSE_CLIENT (format "ca-pub-XXXXXXXXXXXXXXXX").
// Begitu env diisi, /ads.txt otomatis valid tanpa perlu edit file manual.
export const dynamic = "force-static";
export const revalidate = 86400; // 24 jam

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

  // ca-pub-1234... -> pub-1234... (publisher id pada baris ads.txt tanpa prefix "ca-")
  const publisherId =
    client && /^ca-pub-\d+$/.test(client) ? client.replace(/^ca-/, "") : null;

  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# ads.txt — set NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXXXXXXXXXXXXXX) untuk mengaktifkan baris AdSense.\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

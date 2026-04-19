import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Semua Topik - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    badge: "INDEKS",
    title: "Semua Topik Hukum",
    subtitle: "Jelajahi seluruh tag dan topik berita hukum di Jurnalis Hukum Bandung",
  });
}

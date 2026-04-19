import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Redaksi - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    badge: "TIM REDAKSI",
    title: "Redaksi Jurnalis Hukum Bandung",
    subtitle: "Tim editor dan jurnalis di balik liputan hukum kami di Bandung dan Jawa Barat",
  });
}

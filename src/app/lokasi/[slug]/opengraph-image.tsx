import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Lokasi - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const LOCATIONS: Record<string, string> = {
  "bandung": "Kota Bandung",
  "bandung-barat": "Bandung Barat",
  "kabupaten-bandung": "Kabupaten Bandung",
  "cimahi": "Kota Cimahi",
  "sumedang": "Sumedang",
  "garut": "Garut",
  "cianjur": "Cianjur",
  "subang": "Subang",
  "purwakarta": "Purwakarta",
  "jawa-barat": "Jawa Barat",
};

export default async function Image({ params }: { params: { slug: string } }) {
  const name = LOCATIONS[params.slug] || "Lokasi";

  return renderOgImage({
    badge: "LOKASI",
    title: `Berita Hukum ${name}`,
    subtitle: `Liputan sidang, kasus, dan perkembangan hukum di wilayah ${name}`,
  });
}

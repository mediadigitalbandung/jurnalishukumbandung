import { prisma } from "@/lib/prisma";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Kategori - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, _count: { select: { articles: true } } },
  });

  const title = category?.name || "Kategori";
  const subtitle = category?.description
    || `${category?._count.articles ?? 0} berita hukum dalam kategori ini`;

  return renderOgImage({
    badge: "KATEGORI",
    title,
    subtitle,
  });
}

import { prisma } from "@/lib/prisma";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Tag - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
  const tag = await prisma.tag.findUnique({
    where: { slug: params.slug },
    select: { name: true, _count: { select: { articles: true } } },
  });

  const title = tag?.name ? `#${tag.name}` : "Tag";
  const subtitle = `${tag?._count.articles ?? 0} berita terkait tag ini`;

  return renderOgImage({
    badge: "TOPIK",
    title,
    subtitle,
  });
}

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/template";

export const runtime = "nodejs";
export const alt = "Penulis - Jurnalis Hukum Bandung";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      name: true,
      bio: true,
      _count: { select: { articles: { where: { status: "PUBLISHED" } } } },
    },
  });
  const author = users.find((u) => slugify(u.name) === params.slug);

  const title = author?.name || "Penulis";
  const subtitle = author?.bio
    ? author.bio
    : `${author?._count.articles ?? 0} artikel di Jurnalis Hukum Bandung`;

  return renderOgImage({
    badge: "PENULIS",
    title,
    subtitle,
  });
}

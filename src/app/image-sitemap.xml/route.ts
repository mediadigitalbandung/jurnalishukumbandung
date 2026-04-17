import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      featuredImage: { not: null },
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      updatedAt: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 5000,
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${articles
  .map((article) => {
    const imageUrl = article.featuredImage!.startsWith("http")
      ? article.featuredImage!
      : `${siteUrl}${article.featuredImage}`;

    return `  <url>
    <loc>${siteUrl}/berita/${escapeXml(article.slug)}</loc>
    <lastmod>${article.updatedAt.toISOString()}</lastmod>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(article.title)}</image:title>
      <image:caption>${escapeXml(article.excerpt || article.title)}</image:caption>
    </image:image>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

import { prisma } from "@/lib/prisma";
import { toJakartaISO } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  // Google News only indexes articles from the last 2 days for "Top Stories"
  // but keeps articles up to 30 days in News tab
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: thirtyDaysAgo },
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
      tags: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 1000,
  });

  // Fallback: if no recent articles, get the latest 50
  if (articles.length === 0) {
    articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { name: true } },
        category: { select: { name: true } },
        tags: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${articles
  .map((article) => {
    const pubDate = article.publishedAt
      ? toJakartaISO(article.publishedAt)
      : toJakartaISO(new Date());
    const keywords = article.tags.map((t) => t.name).join(", ");
    const imageUrl = article.featuredImage
      ? (article.featuredImage.startsWith("http") ? article.featuredImage : `${siteUrl}${article.featuredImage}`)
      : null;

    return `  <url>
    <loc>${siteUrl}/berita/${escapeXml(article.slug)}</loc>
    <lastmod>${toJakartaISO(article.updatedAt)}</lastmod>
    <news:news>
      <news:publication>
        <news:name>Jurnalis Hukum Bandung</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>${keywords ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>${imageUrl ? `\n    <image:image>\n      <image:loc>${escapeXml(imageUrl)}</image:loc>\n      <image:caption>${escapeXml(article.excerpt || article.title)}</image:caption>\n    </image:image>` : ""}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      // Short cache — new articles must appear ASAP
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
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

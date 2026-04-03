import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jhb.kartawarta.com";

  // Get recent published articles (last 30 days, Google News indexes last 30 days)
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
      publishedAt: true,
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
        publishedAt: true,
        category: { select: { name: true } },
        tags: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map((article) => {
    const pubDate = article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : new Date().toISOString();
    const keywords = article.tags.map((t) => t.name).join(", ");

    return `  <url>
    <loc>${siteUrl}/berita/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Jurnalis Hukum Bandung</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>${keywords ? `\n      <news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=300, s-maxage=300",
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

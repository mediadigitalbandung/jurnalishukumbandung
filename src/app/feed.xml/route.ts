import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/author-display";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://jurnalishukumbandung.com";

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: { author: true, category: true, tags: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const items = articles
    .map((a) => {
      const imageUrl = a.featuredImage
        ? (a.featuredImage.startsWith("http") ? a.featuredImage : `${siteUrl}${a.featuredImage}`)
        : null;

      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${siteUrl}/berita/${escapeXml(a.slug)}</link>
      <description><![CDATA[${a.excerpt || ""}]]></description>
      <pubDate>${a.publishedAt?.toUTCString() || ""}</pubDate>
      <guid isPermaLink="true">${siteUrl}/berita/${escapeXml(a.slug)}</guid>
      <category>${escapeXml(a.category.name)}</category>
      <dc:creator>${escapeXml(displayName(a.author))}</dc:creator>${imageUrl ? `\n      <media:content url="${escapeXml(imageUrl)}" medium="image" />\n      <media:thumbnail url="${escapeXml(imageUrl)}" />` : ""}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Jurnalis Hukum Bandung</title>
    <link>${siteUrl}</link>
    <description>Portal berita hukum terpercaya di Bandung. Menyajikan berita hukum pidana, perdata, tata negara, HAM, dan analisis hukum.</description>
    <language>id</language>
    <copyright>Copyright ${new Date().getFullYear()} Jurnalis Hukum Bandung</copyright>
    <managingEditor>redaksi@jurnalishukumbandung.com (Jurnalis Hukum Bandung)</managingEditor>
    <webMaster>redaksi@jurnalishukumbandung.com (Jurnalis Hukum Bandung)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${siteUrl}/logo-jhb.png</url>
      <title>Jurnalis Hukum Bandung</title>
      <link>${siteUrl}</link>
      <width>512</width>
      <height>512</height>
    </image>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120, stale-while-revalidate=300",
    },
  });
}

import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://jurnalishukumbandung.com";

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${siteUrl}/berita`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${siteUrl}/kategori`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${siteUrl}/redaksi`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/tentang`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/kontak`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/kode-etik`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privasi`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/pedoman-media`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Category pages
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  // Tag pages — important for long-tail SEO
  const tags = await prisma.tag.findMany({
    select: { slug: true },
  });
  const tagPages: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${siteUrl}/tag/${t.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Published articles — ALL of them (up to 49000 to stay within 50k sitemap limit)
  // Dynamic priority: recent articles get higher priority
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 49000,
  });

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => {
    const pubDate = a.publishedAt || a.updatedAt;
    const isRecent = pubDate > sevenDaysAgo;
    const isMonthOld = pubDate > thirtyDaysAgo;

    return {
      url: `${siteUrl}/berita/${a.slug}`,
      lastModified: a.updatedAt,
      // Recent articles change more (corrections, updates)
      changeFrequency: (isRecent ? "daily" : isMonthOld ? "weekly" : "monthly") as "daily" | "weekly" | "monthly",
      // Fresher = higher priority (Google favors fresh news)
      priority: isRecent ? 0.9 : isMonthOld ? 0.7 : 0.5,
    };
  });

  // Author pages
  const authors = await prisma.user.findMany({
    where: { isActive: true },
    select: { name: true },
  });
  const authorPages: MetadataRoute.Sitemap = authors.map((u) => ({
    url: `${siteUrl}/penulis/${u.name.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...categoryPages, ...tagPages, ...articlePages, ...authorPages];
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://jurnalishukumbandung.com";

  return {
    rules: [
      // Googlebot — allow everything public, max crawl
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/panel/", "/api/", "/login", "/offline"],
      },
      // Googlebot-News — specifically for Google News indexing
      {
        userAgent: "Googlebot-News",
        allow: ["/berita/", "/kategori/", "/tag/"],
        disallow: ["/panel/", "/api/", "/login"],
      },
      // Bingbot
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/panel/", "/api/", "/login", "/offline"],
      },
      // All other crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel/", "/api/", "/login", "/offline"],
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/news-sitemap.xml`,
      `${siteUrl}/image-sitemap.xml`,
    ],
    host: siteUrl,
  };
}

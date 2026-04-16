export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/artikel/ArticleCard";
import { Hash, TrendingUp, Clock, Eye } from "lucide-react";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tag = await prisma.tag.findUnique({ where: { slug: params.slug } });
  if (!tag) return { title: "Topik Tidak Ditemukan" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const articleCount = await prisma.article.count({
    where: { status: "PUBLISHED", tags: { some: { slug: params.slug } } },
  });

  return {
    title: `Topik ${tag.name} — ${articleCount} Berita & Analisis Hukum Bandung`,
    description: `Kumpulan lengkap ${articleCount} berita dan analisis tentang ${tag.name} di Bandung. Liputan sidang, kronologi kasus, dan perkembangan terbaru.`,
    keywords: `${tag.name.toLowerCase()}, ${tag.name.toLowerCase()} bandung, topik ${tag.name.toLowerCase()}, berita ${tag.name.toLowerCase()}, hukum bandung`,
    openGraph: {
      title: `Topik ${tag.name} — Berita Hukum Bandung`,
      description: `Kumpulan lengkap ${articleCount} berita tentang ${tag.name} di Bandung.`,
      type: "website",
      url: `${appUrl}/topik/${params.slug}`,
    },
    alternates: {
      canonical: `${appUrl}/topik/${params.slug}`,
    },
  };
}

export default async function TopikPage({ params }: PageProps) {
  const tag = await prisma.tag.findUnique({ where: { slug: params.slug } });
  if (!tag) notFound();

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", tags: { some: { slug: params.slug } } },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
  });

  if (articles.length === 0) notFound();

  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);
  const latestDate = articles[0]?.publishedAt;

  // Related topics — tags that appear in the same articles
  const relatedTagIds = await prisma.tag.findMany({
    where: {
      articles: { some: { tags: { some: { slug: params.slug } } } },
      slug: { not: params.slug },
    },
    take: 8,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Topik", item: `${appUrl}/topik` },
      { "@type": "ListItem", position: 3, name: tag.name },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Topik ${tag.name} — Berita Hukum Bandung`,
    description: `Kumpulan lengkap ${articles.length} berita dan analisis tentang ${tag.name} di Bandung.`,
    url: `${appUrl}/topik/${params.slug}`,
    isPartOf: { "@type": "WebSite", "@id": `${appUrl}/#website` },
    about: { "@type": "Thing", name: tag.name },
    numberOfItems: articles.length,
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbLd, collectionLd]) }}
      />
      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <Link href="/topik" className="hover:text-goto-green">Topik</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">{tag.name}</span>
        </nav>

        {/* Topic header */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-goto-light text-goto-green">
              <Hash size={24} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
                Topik: {tag.name}
              </h1>
              <p className="text-sm text-txt-secondary">
                Kumpulan liputan lengkap tentang {tag.name} di Bandung
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-txt-muted">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} />
              <strong className="text-txt-primary">{articles.length}</strong> artikel
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              <strong className="text-txt-primary">{totalViews.toLocaleString("id-ID")}</strong> total views
            </span>
            {latestDate && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                Update terakhir: {new Date(latestDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>
        </div>

        {/* Related topics */}
        {relatedTagIds.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Topik Terkait:</span>
            {relatedTagIds.map((rt) => (
              <Link
                key={rt.slug}
                href={`/topik/${rt.slug}`}
                className="text-xs font-medium text-goto-green border border-border rounded-full px-3 py-1 hover:bg-goto-light transition-colors"
              >
                {rt.name}
              </Link>
            ))}
          </div>
        )}

        {/* Articles */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary sm:text-lg">
            <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
            Semua Berita tentang {tag.name}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} {...article} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/artikel/ArticleCard";
import { Calendar, TrendingUp, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface PageProps {
  params: { slug: string };
}

function parseDateSlug(slug: string): Date | null {
  const match = slug.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  if (isNaN(date.getTime())) return null;
  return date;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dateToSlug(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const date = parseDateSlug(params.slug);
  if (!date) return { title: "Tanggal Tidak Valid" };

  const label = formatDateLabel(date);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  return {
    title: `Berita Hukum Bandung ${label}`,
    description: `Rangkuman berita hukum Bandung hari ${label}. Kumpulan liputan sidang, kasus hukum, dan perkembangan hukum hari ini.`,
    keywords: `berita hukum hari ini, hukum bandung hari ini, berita hukum ${label.toLowerCase()}, hukum bandung terbaru`,
    openGraph: {
      title: `Berita Hukum Bandung — ${label}`,
      description: `Rangkuman berita hukum Bandung hari ${label}.`,
      type: "website",
      url: `${appUrl}/rangkuman/harian/${params.slug}`,
    },
    alternates: {
      canonical: `${appUrl}/rangkuman/harian/${params.slug}`,
    },
  };
}

export default async function RangkumanHarianPage({ params }: PageProps) {
  const date = parseDateSlug(params.slug);
  if (!date) notFound();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
  });

  if (articles.length === 0) notFound();

  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);
  const label = formatDateLabel(date);
  const categories = Array.from(new Set(articles.map((a) => a.category.name)));

  // Prev/next day navigation
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const prevCount = await prisma.article.count({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(prevDay.setHours(0, 0, 0, 0)), lte: new Date(new Date(prevDay).setHours(23, 59, 59, 999)) } },
  });
  const nextCount = nextDay <= today ? await prisma.article.count({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(nextDay.setHours(0, 0, 0, 0)), lte: new Date(new Date(nextDay).setHours(23, 59, 59, 999)) } },
  }) : 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Rangkuman", item: `${appUrl}/rangkuman` },
      { "@type": "ListItem", position: 3, name: "Harian", item: `${appUrl}/rangkuman/harian` },
      { "@type": "ListItem", position: 4, name: label },
    ],
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <Link href="/rangkuman" className="hover:text-goto-green">Rangkuman</Link>
          <span>&gt;</span>
          <Link href="/rangkuman/harian" className="hover:text-goto-green">Harian</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">{label}</span>
        </nav>

        {/* Header */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-goto-light text-goto-green">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-txt-primary sm:text-2xl">
                Berita Hukum Bandung
              </h1>
              <p className="text-base text-txt-secondary">{label}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-txt-muted">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} />
              <strong className="text-txt-primary">{articles.length}</strong> berita
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} />
              <strong className="text-txt-primary">{totalViews.toLocaleString("id-ID")}</strong> total views
            </span>
          </div>

          {categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span key={cat} className="badge-green text-xs">{cat}</span>
              ))}
            </div>
          )}
        </div>

        {/* Day navigation */}
        <div className="mt-4 flex items-center justify-between">
          {prevCount > 0 ? (
            <Link
              href={`/rangkuman/harian/${dateToSlug(prevDay)}`}
              className="btn-secondary text-sm"
            >
              <ChevronLeft size={14} />
              Hari Sebelumnya
            </Link>
          ) : <div />}
          {nextCount > 0 ? (
            <Link
              href={`/rangkuman/harian/${dateToSlug(nextDay)}`}
              className="btn-secondary text-sm"
            >
              Hari Berikutnya
              <ChevronRight size={14} />
            </Link>
          ) : <div />}
        </div>

        {/* Articles */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary sm:text-lg">
            <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
            Semua Berita Hari Ini
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

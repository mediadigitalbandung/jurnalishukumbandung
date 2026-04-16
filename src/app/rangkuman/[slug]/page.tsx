export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/artikel/ArticleCard";
import { Calendar, TrendingUp, Eye } from "lucide-react";

interface PageProps {
  params: { slug: string };
}

function parseWeekSlug(slug: string): { weekNum: number; year: number } | null {
  const match = slug.match(/^minggu-(\d+)-(\d{4})$/);
  if (!match) return null;
  return { weekNum: parseInt(match[1]), year: parseInt(match[2]) };
}

function getWeekDateRange(weekNum: number, year: number): { start: Date; end: Date } {
  const startOfYear = new Date(year, 0, 1);
  const dayOffset = (weekNum - 1) * 7 - startOfYear.getDay() + 1;
  const start = new Date(year, 0, 1 + dayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
  return `${fmt(start)} — ${fmt(end)} ${end.getFullYear()}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const parsed = parseWeekSlug(params.slug);
  if (!parsed) return { title: "Rangkuman Tidak Ditemukan" };

  const { start, end } = getWeekDateRange(parsed.weekNum, parsed.year);
  const label = formatWeekLabel(start, end);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  return {
    title: `Rangkuman Berita Hukum Bandung ${label}`,
    description: `Ringkasan berita hukum Bandung periode ${label}. Kumpulan liputan sidang, kasus hukum, dan perkembangan hukum terbaru minggu ini.`,
    keywords: `rangkuman hukum bandung, berita hukum minggu ini, hukum bandung terbaru, berita hukum ${parsed.year}`,
    alternates: {
      canonical: `${appUrl}/rangkuman/${params.slug}`,
    },
  };
}

export default async function RangkumanPage({ params }: PageProps) {
  const parsed = parseWeekSlug(params.slug);
  if (!parsed) notFound();

  const { start, end } = getWeekDateRange(parsed.weekNum, parsed.year);
  const label = formatWeekLabel(start, end);

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: start, lte: end },
    },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
  });

  if (articles.length === 0) notFound();

  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);

  // Get unique categories this week
  const categories = Array.from(new Set(articles.map((a) => a.category.name)));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Rangkuman", item: `${appUrl}/rangkuman` },
      { "@type": "ListItem", position: 3, name: label },
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
                Rangkuman Berita Hukum Bandung
              </h1>
              <p className="text-sm text-txt-secondary">{label}</p>
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

        {/* Articles */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary sm:text-lg">
            <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
            Berita Minggu Ini
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

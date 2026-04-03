export const revalidate = 60; // ISR: revalidate tag page every 60 seconds

import Link from "next/link";
import { Metadata } from "next";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";
import ArticleCard from "@/components/artikel/ArticleCard";
import BannerAd from "@/components/ads/BannerAd";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const PER_PAGE = 12;

interface PageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tag = await prisma.tag.findUnique({ where: { slug: params.slug } });
  if (!tag) return { title: "Tag Tidak Ditemukan" };
  return {
    title: `Berita ${tag.name} Terbaru - Jurnalis Hukum Bandung`,
    description: `Baca berita terbaru tentang ${tag.name}. Kumpulan artikel dan analisis hukum terkait ${tag.name} di Bandung dan Indonesia.`,
    alternates: {
      canonical: `/tag/${params.slug}`,
    },
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const tag = await prisma.tag.findUnique({
    where: { slug: params.slug },
  });

  if (!tag) notFound();

  const page = Math.max(1, parseInt(searchParams.page || "1"));

  const where = {
    status: "PUBLISHED" as const,
    tags: { some: { slug: params.slug } },
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { author: true, category: true },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  // Page numbers
  const pageNumbers: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="transition-colors hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">Tag</span>
          <span>&gt;</span>
          <span className="text-txt-primary font-medium">#{tag.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
            <Hash size={24} className="text-goto-green" />
            Tag: #{tag.name}
          </h1>
          <p className="mt-2 text-sm text-txt-secondary">
            {total.toLocaleString("id-ID")} artikel dengan tag ini
          </p>
        </div>

        {/* Ad slot above articles */}
        <BannerAd size="slim" />

        {/* Article grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.slug} {...article} variant="standard" />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Hash size={48} className="mx-auto text-border" />
            <p className="mt-4 text-txt-secondary">Belum ada berita dengan tag ini</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-goto-green hover:underline">
              Kembali ke Beranda
            </Link>
          </div>
        )}

        {/* Ad slot below articles */}
        <BannerAd size="slim" />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link
                href={`/tag/${params.slug}?page=${page - 1}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-primary transition-all hover:border-goto-green hover:text-goto-green"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-muted opacity-50">
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Sebelumnya</span>
              </span>
            )}

            <div className="flex items-center gap-1">
              {startPage > 1 && (
                <>
                  <Link
                    href={`/tag/${params.slug}?page=1`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-txt-secondary hover:bg-surface-secondary transition-colors"
                  >
                    1
                  </Link>
                  {startPage > 2 && <span className="px-1 text-txt-muted">...</span>}
                </>
              )}
              {pageNumbers.map((p) => (
                <Link
                  key={p}
                  href={`/tag/${params.slug}?page=${p}`}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-goto-green text-white"
                      : "text-txt-secondary hover:bg-surface-secondary"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {endPage < totalPages && (
                <>
                  {endPage < totalPages - 1 && <span className="px-1 text-txt-muted">...</span>}
                  <Link
                    href={`/tag/${params.slug}?page=${totalPages}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-txt-secondary hover:bg-surface-secondary transition-colors"
                  >
                    {totalPages}
                  </Link>
                </>
              )}
            </div>

            {page < totalPages ? (
              <Link
                href={`/tag/${params.slug}?page=${page + 1}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-primary transition-all hover:border-goto-green hover:text-goto-green"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-muted opacity-50">
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight size={16} />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

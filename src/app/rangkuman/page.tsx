export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Calendar, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Rangkuman Berita Hukum Bandung Mingguan",
  description: "Rangkuman berita hukum Bandung setiap minggu. Ringkasan liputan sidang, kasus hukum, dan perkembangan hukum terbaru di Bandung dan Jawa Barat.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"}/rangkuman`,
  },
};

function getWeekSlug(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `minggu-${weekNum}-${year}`;
}

function getWeekLabel(date: Date): string {
  const endOfWeek = new Date(date);
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
  return `${fmt(startOfWeek)} — ${fmt(endOfWeek)} ${endOfWeek.getFullYear()}`;
}

export default async function RangkumanIndexPage() {
  // Get articles grouped by week (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: threeMonthsAgo } },
    select: { publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  // Group by week
  const weekMap = new Map<string, { slug: string; label: string; count: number; date: Date }>();
  for (const a of articles) {
    if (!a.publishedAt) continue;
    const slug = getWeekSlug(a.publishedAt);
    if (!weekMap.has(slug)) {
      weekMap.set(slug, { slug, label: getWeekLabel(a.publishedAt), count: 0, date: a.publishedAt });
    }
    weekMap.get(slug)!.count++;
  }
  const weeks = Array.from(weekMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">Rangkuman Mingguan</span>
        </nav>

        <h1 className="font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
          Rangkuman Berita Hukum Bandung
        </h1>
        <p className="mt-2 text-base text-txt-secondary">
          Ringkasan berita hukum Bandung setiap minggu — agar kamu tidak ketinggalan informasi penting.
        </p>

        <div className="mt-8 space-y-3">
          {weeks.map((week) => (
            <Link
              key={week.slug}
              href={`/rangkuman/${week.slug}`}
              className="group flex items-center justify-between rounded-[12px] border border-border bg-surface p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-goto-light text-goto-green">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-txt-primary group-hover:text-goto-green">
                    {week.label}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-txt-muted">
                    <FileText size={12} />
                    {week.count} berita
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-goto-green">Baca &rarr;</span>
            </Link>
          ))}
          {weeks.length === 0 && (
            <p className="text-center text-txt-muted py-12">Belum ada rangkuman tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
}

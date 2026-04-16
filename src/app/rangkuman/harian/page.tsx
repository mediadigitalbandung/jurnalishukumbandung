export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Calendar, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Rangkuman Harian Berita Hukum Bandung",
  description: "Rangkuman berita hukum Bandung setiap hari. Ringkasan liputan sidang, kasus hukum, dan perkembangan hukum terbaru di Bandung.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"}/rangkuman/harian`,
  },
};

export default async function RangkumanHarianIndexPage() {
  // Get dates that have published articles (last 60 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: sixtyDaysAgo } },
    select: { publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  // Group by date
  const dayMap = new Map<string, { slug: string; label: string; count: number; date: Date }>();
  for (const a of articles) {
    if (!a.publishedAt) continue;
    const d = a.publishedAt;
    const slug = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dayMap.has(slug)) {
      dayMap.set(slug, {
        slug,
        label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        count: 0,
        date: d,
      });
    }
    dayMap.get(slug)!.count++;
  }
  const days = Array.from(dayMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <Link href="/rangkuman" className="hover:text-goto-green">Rangkuman</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">Harian</span>
        </nav>

        <h1 className="font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
          Rangkuman Harian Berita Hukum Bandung
        </h1>
        <p className="mt-2 text-base text-txt-secondary">
          Berita hukum Bandung hari per hari — jangan sampai ketinggalan.
        </p>

        <div className="mt-8 space-y-3">
          {days.map((day) => (
            <Link
              key={day.slug}
              href={`/rangkuman/harian/${day.slug}`}
              className="group flex items-center justify-between rounded-[12px] border border-border bg-surface p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-goto-light text-goto-green">
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-txt-primary group-hover:text-goto-green">
                    {day.label}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-txt-muted">
                    <FileText size={12} />
                    {day.count} berita
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-goto-green">Baca &rarr;</span>
            </Link>
          ))}
          {days.length === 0 && (
            <p className="text-center text-txt-muted py-12">Belum ada rangkuman tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
}

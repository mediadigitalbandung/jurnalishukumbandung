export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Sparkles, Clock, BookOpen, Scale, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Sorotan Berita Hukum Bandung — Kronologi, Analisis & Dampak",
  description:
    "Sorotan berita hukum Bandung: kronologi kasus, analisis hukum, dan dampak kejadian. Pahami berita hukum dari berbagai sudut pandang.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"}/sorotan`,
  },
};

const angleIcons: Record<string, typeof BookOpen> = {
  kronologi: Clock,
  analisis: Scale,
  dampak: AlertTriangle,
};

const angleLabels: Record<string, string> = {
  kronologi: "Kronologi",
  analisis: "Analisis Hukum",
  dampak: "Dampak & Implikasi",
};

export default async function SorotanIndexPage() {
  const sorotanList = await prisma.sorotan.findMany({
    include: {
      article: {
        select: { title: true, slug: true, featuredImage: true, category: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">Sorotan</span>
        </nav>

        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={28} className="text-goto-green" />
          <h1 className="font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
            Sorotan Berita Hukum Bandung
          </h1>
        </div>
        <p className="text-base text-txt-secondary mb-8">
          Pahami berita hukum dari berbagai sudut pandang — kronologi kejadian, analisis hukum, dan dampak ke masyarakat.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorotanList.map((s) => {
            const Icon = angleIcons[s.angle] || BookOpen;
            return (
              <Link
                key={s.slug}
                href={`/sorotan/${s.slug}`}
                className="group rounded-[12px] border border-border bg-surface p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-goto-light text-goto-green">
                    <Icon size={14} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-goto-green">
                    {angleLabels[s.angle] || s.angle}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-txt-primary group-hover:text-goto-green line-clamp-2 leading-snug">
                  {s.title}
                </h2>
                <p className="mt-2 text-xs text-txt-muted line-clamp-2">
                  {s.content.replace(/<[^>]*>/g, "").slice(0, 120)}...
                </p>
                <p className="mt-2 text-xs text-txt-muted">
                  {s.article.category.name}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

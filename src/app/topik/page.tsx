export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Hash, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Topik Hukum Bandung — Kumpulan Liputan & Analisis",
  description:
    "Jelajahi topik-topik hukum Bandung terpopuler. Kumpulan liputan lengkap, analisis, dan berita terkait kasus hukum di Bandung dan Jawa Barat.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"}/topik`,
  },
};

export default async function TopikIndexPage() {
  // Get tags with article count, sorted by most articles
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { articles: { _count: "desc" } },
  });

  // Only show tags with 2+ articles (meaningful topics)
  const topics = tags
    .filter((t) => t._count.articles >= 2)
    .slice(0, 50);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Topik Hukum" },
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
          <span className="text-txt-muted">Topik Hukum</span>
        </nav>

        <h1 className="font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
          Topik Hukum Bandung
        </h1>
        <p className="mt-2 text-base text-txt-secondary">
          Kumpulan liputan lengkap berdasarkan topik hukum di Bandung dan Jawa Barat.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topik/${topic.slug}`}
              className="group rounded-[12px] border border-border bg-surface p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-goto-light text-goto-green">
                  <Hash size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-txt-primary group-hover:text-goto-green truncate">
                    {topic.name}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-txt-muted">
                    <FileText size={12} />
                    {topic._count.articles} artikel
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

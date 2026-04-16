export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/artikel/ArticleCard";
import { MapPin, TrendingUp, Eye } from "lucide-react";

const LOCATIONS: Record<string, { name: string; keywords: string[] }> = {
  "bandung": { name: "Kota Bandung", keywords: ["bandung", "kota bandung", "pn bandung"] },
  "bandung-barat": { name: "Bandung Barat", keywords: ["bandung barat", "kbb"] },
  "kabupaten-bandung": { name: "Kabupaten Bandung", keywords: ["kabupaten bandung", "kab bandung", "banjaran", "soreang", "bale bandung"] },
  "cimahi": { name: "Kota Cimahi", keywords: ["cimahi"] },
  "sumedang": { name: "Sumedang", keywords: ["sumedang"] },
  "garut": { name: "Garut", keywords: ["garut"] },
  "cianjur": { name: "Cianjur", keywords: ["cianjur"] },
  "subang": { name: "Subang", keywords: ["subang"] },
  "purwakarta": { name: "Purwakarta", keywords: ["purwakarta"] },
  "jawa-barat": { name: "Jawa Barat", keywords: ["jawa barat", "jabar", "provinsi jawa barat"] },
};

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const location = LOCATIONS[params.slug];
  if (!location) return { title: "Lokasi Tidak Ditemukan" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  return {
    title: `Berita Hukum ${location.name} Terbaru — Jurnalis Hukum Bandung`,
    description: `Kumpulan berita hukum ${location.name} terbaru. Liputan sidang pengadilan, kasus hukum, dan perkembangan hukum di wilayah ${location.name}.`,
    keywords: `hukum ${location.name.toLowerCase()}, berita hukum ${location.name.toLowerCase()}, pengadilan ${location.name.toLowerCase()}, sidang ${location.name.toLowerCase()}, hukum bandung`,
    openGraph: {
      title: `Berita Hukum ${location.name} — Jurnalis Hukum Bandung`,
      description: `Kumpulan berita hukum ${location.name} terbaru.`,
      type: "website",
      url: `${appUrl}/lokasi/${params.slug}`,
    },
    alternates: {
      canonical: `${appUrl}/lokasi/${params.slug}`,
    },
  };
}

export default async function LokasiPage({ params }: PageProps) {
  const location = LOCATIONS[params.slug];
  if (!location) notFound();

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: location.keywords.map((kw) => ({
        OR: [
          { title: { contains: kw, mode: "insensitive" as const } },
          { content: { contains: kw, mode: "insensitive" as const } },
        ],
      })),
    },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  if (articles.length === 0) notFound();

  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Lokasi", item: `${appUrl}/lokasi` },
      { "@type": "ListItem", position: 3, name: location.name },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Berita Hukum ${location.name}`,
    description: `Kumpulan berita hukum ${location.name} terbaru.`,
    url: `${appUrl}/lokasi/${params.slug}`,
    about: {
      "@type": "Place",
      name: location.name,
      address: {
        "@type": "PostalAddress",
        addressRegion: "Jawa Barat",
        addressCountry: "ID",
      },
    },
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbLd, collectionLd]) }}
      />
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <Link href="/lokasi" className="hover:text-goto-green">Lokasi</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">{location.name}</span>
        </nav>

        {/* Header */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-goto-light text-goto-green">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
                Berita Hukum {location.name}
              </h1>
              <p className="text-sm text-txt-secondary">
                Liputan hukum di wilayah {location.name}, Jawa Barat
              </p>
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
        </div>

        {/* Other locations */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Lokasi Lain:</span>
          {Object.entries(LOCATIONS)
            .filter(([slug]) => slug !== params.slug)
            .slice(0, 6)
            .map(([slug, loc]) => (
              <Link
                key={slug}
                href={`/lokasi/${slug}`}
                className="text-xs font-medium text-goto-green border border-border rounded-full px-3 py-1 hover:bg-goto-light transition-colors"
              >
                {loc.name}
              </Link>
            ))}
        </div>

        {/* Articles */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary sm:text-lg">
            <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
            Berita Hukum di {location.name}
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

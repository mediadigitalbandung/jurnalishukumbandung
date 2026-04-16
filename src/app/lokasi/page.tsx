export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MapPin, FileText } from "lucide-react";

const LOCATIONS = [
  { slug: "bandung", name: "Kota Bandung", keywords: ["bandung", "kota bandung", "pn bandung"] },
  { slug: "bandung-barat", name: "Bandung Barat", keywords: ["bandung barat", "kbb"] },
  { slug: "kabupaten-bandung", name: "Kabupaten Bandung", keywords: ["kabupaten bandung", "kab bandung", "banjaran", "soreang", "bale bandung"] },
  { slug: "cimahi", name: "Kota Cimahi", keywords: ["cimahi"] },
  { slug: "sumedang", name: "Sumedang", keywords: ["sumedang"] },
  { slug: "garut", name: "Garut", keywords: ["garut"] },
  { slug: "cianjur", name: "Cianjur", keywords: ["cianjur"] },
  { slug: "subang", name: "Subang", keywords: ["subang"] },
  { slug: "purwakarta", name: "Purwakarta", keywords: ["purwakarta"] },
  { slug: "jawa-barat", name: "Jawa Barat", keywords: ["jawa barat", "jabar", "provinsi jawa barat"] },
];

export const metadata: Metadata = {
  title: "Berita Hukum per Lokasi — Bandung & Jawa Barat",
  description: "Berita hukum berdasarkan lokasi di Bandung, Jawa Barat. Liputan sidang pengadilan, kasus hukum, dan informasi hukum per wilayah.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"}/lokasi`,
  },
};

export default async function LokasiIndexPage() {
  // Count articles per location
  const locationCounts = await Promise.all(
    LOCATIONS.map(async (loc) => {
      const count = await prisma.article.count({
        where: {
          status: "PUBLISHED",
          OR: loc.keywords.map((kw) => ({
            OR: [
              { title: { contains: kw, mode: "insensitive" as const } },
              { content: { contains: kw, mode: "insensitive" as const } },
            ],
          })),
        },
      });
      return { ...loc, count };
    })
  );

  const activeLocations = locationCounts.filter((l) => l.count > 0);

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <span className="text-txt-muted">Berita per Lokasi</span>
        </nav>

        <h1 className="font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
          Berita Hukum per Lokasi
        </h1>
        <p className="mt-2 text-base text-txt-secondary">
          Telusuri berita hukum berdasarkan wilayah di Bandung dan Jawa Barat.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeLocations.map((loc) => (
            <Link
              key={loc.slug}
              href={`/lokasi/${loc.slug}`}
              className="group rounded-[12px] border border-border bg-surface p-5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-goto-light text-goto-green">
                  <MapPin size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-txt-primary group-hover:text-goto-green">
                    {loc.name}
                  </h2>
                  <p className="flex items-center gap-1 text-sm text-txt-muted">
                    <FileText size={12} />
                    {loc.count} berita
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

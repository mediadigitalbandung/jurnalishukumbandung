export const revalidate = 120; // ISR: revalidate author page every 2 minutes

import { Metadata } from "next";
import ArticleCard from "@/components/artikel/ArticleCard";
import { FileText, Eye, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { slugify } from "@/lib/utils";

async function getAuthorBySlug(slug: string) {
  // SUPER_ADMIN di-hidden dari halaman publik — mereka selalu tampil sebagai "Redaksi"
  const users = await prisma.user.findMany({
    where: { isActive: true },
  });
  return users.find((u) => slugify(u.name) === slug) || null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  if (!author) return { title: "Penulis Tidak Ditemukan" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const description = author.bio || `Profil dan artikel oleh ${author.name}, jurnalis hukum di Jurnalis Hukum Bandung.`;
  const avatarUrl = author.avatar
    ? (author.avatar.startsWith("http") ? author.avatar : `${appUrl}${author.avatar}`)
    : `${appUrl}/logo-jhb.png`;

  return {
    title: `${author.name} — Jurnalis Hukum Bandung`,
    description,
    openGraph: {
      title: `${author.name} — Jurnalis Hukum Bandung`,
      description,
      type: "profile",
      url: `${appUrl}/penulis/${params.slug}`,
      siteName: "Jurnalis Hukum Bandung",
      locale: "id_ID",
      images: [{ url: avatarUrl, width: 512, height: 512, alt: `${author.name} - Jurnalis Hukum Bandung` }],
    },
    twitter: {
      card: "summary",
      site: "@jurnalishukumbdg",
      title: `${author.name} — Jurnalis Hukum Bandung`,
      description,
      images: [avatarUrl],
    },
    alternates: {
      canonical: `${appUrl}/penulis/${params.slug}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PenulisPage({ params }: { params: { slug: string } }) {
  const author = await getAuthorBySlug(params.slug);
  if (!author) notFound();

  const [articles, viewAgg] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED", authorId: author.id },
      include: { author: true, category: true },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.article.aggregate({
      where: { status: "PUBLISHED", authorId: author.id },
      _sum: { viewCount: true },
    }),
  ]);

  const totalArticles = articles.length;
  const totalViews = viewAgg._sum.viewCount || 0;
  const joinedDate = author.createdAt.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const authorUrl = `${appUrl}/penulis/${params.slug}`;

  // Parse mediaSosial (could be JSON or comma-separated URLs)
  const sameAsList: string[] = [];
  if (author.portofolio) sameAsList.push(author.portofolio);
  if (author.mediaSosial) {
    try {
      const parsed = JSON.parse(author.mediaSosial);
      if (Array.isArray(parsed)) sameAsList.push(...parsed.filter((u) => typeof u === "string"));
      else if (typeof parsed === "object") {
        for (const v of Object.values(parsed)) if (typeof v === "string" && v.startsWith("http")) sameAsList.push(v);
      }
    } catch {
      // Plain string or comma-separated URLs
      const urls = author.mediaSosial.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.startsWith("http"));
      sameAsList.push(...urls);
    }
  }

  // Parse pendidikan (could be "Universitas Padjadjaran, S.H." format)
  const alumniOf = author.pendidikan
    ? author.pendidikan.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((edu) => ({
        "@type": "EducationalOrganization",
        name: edu,
      }))
    : undefined;

  // Parse keahlian (comma-separated skills)
  const expertiseList = author.keahlian
    ? author.keahlian.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
    : [];

  // E-E-A-T: Person structured data for author expertise signals (enhanced)
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${authorUrl}#person`,
    name: author.name,
    url: authorUrl,
    ...(author.bio && { description: author.bio }),
    ...(author.avatar && { image: author.avatar.startsWith("http") ? author.avatar : `${appUrl}${author.avatar}` }),
    ...(author.email && { email: author.email }),
    ...(author.phone && { telephone: author.phone }),
    jobTitle: author.specialization || "Jurnalis Hukum",
    worksFor: {
      "@type": "NewsMediaOrganization",
      "@id": `${appUrl}/#organization`,
      name: "Jurnalis Hukum Bandung",
      url: appUrl,
    },
    ...(alumniOf && alumniOf.length > 0 && { alumniOf }),
    ...(author.organisasiPers && {
      memberOf: {
        "@type": "Organization",
        name: author.organisasiPers,
      },
    }),
    ...(author.nomorKartuPers && {
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Press Card",
        name: "Kartu Pers Indonesia",
        identifier: author.nomorKartuPers,
      },
    }),
    knowsAbout: Array.from(new Set([
      "Hukum Pidana", "Hukum Perdata", "Hukum Tata Negara",
      "HAM", "Peradilan", "Hukum Indonesia",
      ...(author.specialization ? [author.specialization] : []),
      ...expertiseList,
    ])),
    ...(sameAsList.length > 0 && { sameAs: sameAsList }),
    mainEntityOfPage: { "@type": "ProfilePage", "@id": authorUrl },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Penulis", item: `${appUrl}/redaksi` },
      { "@type": "ListItem", position: 3, name: author.name },
    ],
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape `<` so user-controlled fields (bio, name, mediaSosial) can't
          // break out of the JSON-LD block via `</script>` (stored XSS).
          __html: JSON.stringify([personLd, breadcrumbLd]).replace(/</g, "\\u003c"),
        }}
      />
      <div className="container-main py-8">
        {/* Author profile */}
        <div className="rounded-[12px] border border-border bg-surface p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-goto-green text-4xl font-bold text-white">
              {author.name.charAt(0)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
                {author.name}
              </h1>
              <p className="mt-1 text-sm text-goto-green">{author.role.replace(/_/g, " ")}</p>
              {author.specialization && (
                <p className="text-sm text-txt-muted">
                  Spesialisasi: {author.specialization}
                </p>
              )}
              <p className="mt-3 max-w-xl text-sm text-txt-secondary">
                {author.bio}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 sm:justify-start">
                <div className="flex items-center gap-1.5 text-sm text-txt-muted">
                  <FileText size={14} />
                  <span className="font-semibold text-txt-primary">
                    {totalArticles}
                  </span>{" "}
                  artikel
                </div>
                <div className="flex items-center gap-1.5 text-sm text-txt-muted">
                  <Eye size={14} />
                  <span className="font-semibold text-txt-primary">
                    {totalViews.toLocaleString("id-ID")}
                  </span>{" "}
                  views
                </div>
                <div className="flex items-center gap-1.5 text-sm text-txt-muted">
                  <Calendar size={14} />
                  Bergabung {joinedDate}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Articles by author */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary sm:text-lg lg:text-xl">
            <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
            Artikel oleh {author.name}
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

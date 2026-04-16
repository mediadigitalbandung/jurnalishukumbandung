export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Clock, Scale, AlertTriangle, ArrowRight, BookOpen, FileText, Gavel, Users, MessageSquare, GitCompare, HelpCircle } from "lucide-react";
import { slugify } from "@/lib/utils";

interface PageProps {
  params: { slug: string };
}

const angleLabels: Record<string, string> = {
  kronologi: "Kronologi",
  analisis: "Analisis Hukum",
  dampak: "Dampak & Implikasi",
  "latar-belakang": "Latar Belakang",
  "fakta-data": "Fakta & Data",
  regulasi: "Regulasi Terkait",
  profil: "Profil & Pihak Terkait",
  opini: "Perspektif & Opini",
  perbandingan: "Perbandingan Kasus",
  "tanya-jawab": "Tanya Jawab",
};

const angleDescriptions: Record<string, string> = {
  kronologi: "Urutan kejadian lengkap dari awal hingga perkembangan terbaru",
  analisis: "Tinjauan aspek hukum, dasar hukum, dan implikasi yuridis",
  dampak: "Dampak ke masyarakat, sistem hukum, dan pelajaran yang bisa diambil",
  "latar-belakang": "Konteks dan latar belakang sebelum kejadian ini terjadi",
  "fakta-data": "Rangkuman fakta kunci dan data penting dari kasus ini",
  regulasi: "Undang-undang dan regulasi yang terkait dengan kasus ini",
  profil: "Profil dan peran pihak-pihak yang terlibat dalam kasus",
  opini: "Berbagai perspektif dan pandangan ahli tentang kasus ini",
  perbandingan: "Perbandingan dengan kasus-kasus serupa yang pernah terjadi",
  "tanya-jawab": "Jawaban atas pertanyaan yang sering diajukan tentang kasus ini",
};

const angleIcons: Record<string, typeof BookOpen> = {
  kronologi: Clock,
  analisis: Scale,
  dampak: AlertTriangle,
  "latar-belakang": BookOpen,
  "fakta-data": FileText,
  regulasi: Gavel,
  profil: Users,
  opini: MessageSquare,
  perbandingan: GitCompare,
  "tanya-jawab": HelpCircle,
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const sorotan = await prisma.sorotan.findUnique({
    where: { slug: params.slug },
    include: { article: { select: { title: true, slug: true, featuredImage: true, category: { select: { name: true } }, author: { select: { name: true } } } } },
  });
  if (!sorotan) return { title: "Sorotan Tidak Ditemukan" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const plainContent = sorotan.content.replace(/<[^>]*>/g, "").slice(0, 155);
  const imageUrl = sorotan.article.featuredImage
    ? (sorotan.article.featuredImage.startsWith("http") ? sorotan.article.featuredImage : `${appUrl}${sorotan.article.featuredImage}`)
    : `${appUrl}/logo-jhb.png`;

  return {
    title: sorotan.title,
    description: plainContent,
    keywords: `${angleLabels[sorotan.angle]?.toLowerCase() || sorotan.angle}, ${sorotan.article.category.name.toLowerCase()}, hukum bandung, berita hukum`,
    openGraph: {
      title: sorotan.title,
      description: plainContent,
      type: "article",
      url: `${appUrl}/sorotan/${params.slug}`,
      siteName: "Jurnalis Hukum Bandung",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: sorotan.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: sorotan.title,
      description: plainContent,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${appUrl}/sorotan/${params.slug}`,
    },
  };
}

export default async function SorotanPage({ params }: PageProps) {
  const sorotan = await prisma.sorotan.findUnique({
    where: { slug: params.slug },
    include: {
      article: {
        select: {
          id: true, title: true, slug: true, excerpt: true, featuredImage: true,
          publishedAt: true, readTime: true, viewCount: true,
          author: { select: { name: true, bio: true } },
          category: { select: { name: true, slug: true } },
          tags: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!sorotan) notFound();

  const { article } = sorotan;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const Icon = angleIcons[sorotan.angle] || BookOpen;

  // Get other sorotan for the same article
  const otherSorotan = await prisma.sorotan.findMany({
    where: { articleId: article.id, slug: { not: params.slug } },
  });

  // Related articles from same category
  const relatedArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      categoryId: { not: undefined },
      category: { slug: article.category.slug },
      id: { not: article.id },
    },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const wordCount = sorotan.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

  // Structured data
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: sorotan.title,
    description: sorotan.content.replace(/<[^>]*>/g, "").slice(0, 155),
    image: article.featuredImage
      ? (article.featuredImage.startsWith("http") ? article.featuredImage : `${appUrl}${article.featuredImage}`)
      : `${appUrl}/logo-jhb.png`,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: sorotan.createdAt.toISOString(),
    author: {
      "@type": "Person",
      name: article.author.name,
      url: `${appUrl}/penulis/${slugify(article.author.name)}`,
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      "@id": `${appUrl}/#organization`,
      name: "Jurnalis Hukum Bandung",
    },
    mainEntityOfPage: `${appUrl}/sorotan/${params.slug}`,
    articleSection: article.category.name,
    wordCount,
    isAccessibleForFree: true,
    inLanguage: "id-ID",
    isBasedOn: `${appUrl}/berita/${article.slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Sorotan", item: `${appUrl}/sorotan` },
      { "@type": "ListItem", position: 3, name: sorotan.title },
    ],
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleLd, breadcrumbLd]) }}
      />

      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <span>&gt;</span>
          <Link href="/sorotan" className="hover:text-goto-green">Sorotan</Link>
          <span>&gt;</span>
          <span className="text-txt-muted truncate max-w-[200px] sm:max-w-[400px]">{sorotan.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Main content */}
          <article className="lg:col-span-2">
            {/* Angle badge */}
            <div className="mb-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-goto-light px-3 py-1 text-xs font-bold text-goto-green">
                <Icon size={12} />
                {angleLabels[sorotan.angle] || sorotan.angle}
              </span>
              <Link
                href={`/kategori/${article.category.slug}`}
                className="text-xs font-bold uppercase tracking-wide text-txt-muted hover:text-goto-green"
              >
                {article.category.name}
              </Link>
            </div>

            {/* Title */}
            <h1 className="font-serif text-2xl font-extrabold leading-tight text-txt-primary sm:text-3xl">
              {sorotan.title}
            </h1>

            {/* Meta */}
            <p className="mt-3 text-sm text-txt-muted">
              {angleDescriptions[sorotan.angle] || ""}
              <span className="mx-2">&middot;</span>
              {Math.ceil(wordCount / 200)} menit baca
            </p>

            <div className="mt-6 h-px bg-border" />

            {/* Featured Image */}
            {article.featuredImage && (
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[12px]">
                <Image src={article.featuredImage} alt={sorotan.title} fill className="object-cover" />
              </div>
            )}

            {/* Content — substantive 300-500 words */}
            <div className="mt-8 article-content text-base sm:text-[17px] leading-[1.8] text-justify">
              {sorotan.content.split("\n").map((paragraph, i) => (
                paragraph.trim() ? <p key={i} className="mb-4">{paragraph.trim()}</p> : null
              ))}
            </div>

            {/* CTA — Baca Berita Lengkap */}
            <div className="mt-8 rounded-[12px] border-2 border-goto-green bg-goto-light p-6">
              <p className="text-sm font-semibold text-txt-primary mb-1">Baca Berita Lengkap</p>
              <p className="text-sm text-txt-secondary mb-4">
                Artikel ini adalah {angleLabels[sorotan.angle]?.toLowerCase()} dari berita utama. Baca versi lengkap untuk detail dan informasi lebih lanjut.
              </p>
              <Link
                href={`/berita/${article.slug}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                {article.title.length > 60 ? article.title.slice(0, 60) + "..." : article.title}
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Other angles */}
            {otherSorotan.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-3 text-base font-bold text-txt-primary">
                  <span className="block h-6 w-[3px] rounded-full bg-goto-green" />
                  Baca dari Sudut Pandang Lain
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {otherSorotan.map((os) => {
                    const OsIcon = angleIcons[os.angle] || BookOpen;
                    return (
                      <Link
                        key={os.slug}
                        href={`/sorotan/${os.slug}`}
                        className="group flex items-center gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-all"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-goto-light text-goto-green">
                          <OsIcon size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-goto-green">{angleLabels[os.angle]}</p>
                          <p className="text-sm font-semibold text-txt-primary group-hover:text-goto-green truncate">
                            {os.title}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-secondary">Tags</span>
              {article.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tag/${tag.slug}`}
                  className="text-xs font-medium text-goto-green border border-border rounded px-2 py-1 hover:bg-surface-secondary transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            {/* Article info card */}
            <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
              <h3 className="text-sm font-bold text-txt-primary mb-3">Berita Utama</h3>
              {article.featuredImage && (
                <Link href={`/berita/${article.slug}`} className="block mb-3">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                    <Image src={article.featuredImage} alt={article.title} fill className="object-cover" />
                  </div>
                </Link>
              )}
              <Link href={`/berita/${article.slug}`} className="text-sm font-semibold text-txt-primary hover:text-goto-green leading-snug">
                {article.title}
              </Link>
              <p className="mt-2 text-xs text-txt-muted">{article.author.name} &middot; {article.readTime || 0} menit baca</p>
            </div>

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-5 rounded-[12px] border border-border bg-surface p-5 shadow-card">
                <h3 className="text-sm font-bold text-txt-primary mb-3">Berita Terkait</h3>
                <div className="space-y-3">
                  {relatedArticles.map((ra) => (
                    <Link key={ra.slug} href={`/berita/${ra.slug}`} className="block group">
                      <p className="text-sm font-semibold text-txt-primary group-hover:text-goto-green leading-snug line-clamp-2">
                        {ra.title}
                      </p>
                      <p className="text-xs text-txt-muted mt-1">{ra.category.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

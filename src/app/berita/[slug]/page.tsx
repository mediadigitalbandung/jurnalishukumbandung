export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import {
  Flag,
  CheckCircle,
} from "lucide-react";
import CopyProtection from "@/components/artikel/CopyProtection";
import ReadingProgress from "@/components/artikel/ReadingProgress";
import PrintButton from "@/components/artikel/PrintButton";
import ShareBar from "@/components/artikel/ShareBar";
import Sidebar from "@/components/layout/Sidebar";
import ArticleCard from "@/components/artikel/ArticleCard";
import BannerAd, { SidebarAd } from "@/components/ads/BannerAd";
import CommentSection from "@/components/artikel/CommentSection";
import BookmarkButton from "@/components/artikel/BookmarkButton";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
// Note: DOMPurify removed — content sanitized at input via API validation
import { slugify } from "@/lib/utils";
import { generateInternalLinksHtml } from "@/lib/seo-utils";

async function getArticle(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: { author: true, category: true, sources: true, tags: true },
  });
  return article as (typeof article & { faqData?: string | null }) | null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return { title: "Artikel Tidak Ditemukan" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt || "";
  const imageUrl = article.featuredImage
    ? (article.featuredImage.startsWith("http") ? article.featuredImage : `${appUrl}${article.featuredImage}`)
    : `${appUrl}/logo-jhb.png`;

  return {
    title: article.title,
    description,
    keywords: article.tags?.map((t: { name: string }) => t.name).join(", "),
    authors: [{ name: article.author.name, url: `${appUrl}/penulis/${slugify(article.author.name)}` }],
    openGraph: {
      title,
      description,
      type: "article",
      url: `${appUrl}/berita/${params.slug}`,
      siteName: "Jurnalis Hukum Bandung",
      locale: "id_ID",
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.author.name],
      section: article.category.name,
      tags: article.tags?.map((t: { name: string }) => t.name),
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title, type: "image/jpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@jurnalishukumbdg",
      creator: "@jurnalishukumbdg",
      title,
      description,
      images: [{ url: imageUrl, alt: article.title }],
    },
    alternates: {
      canonical: `${appUrl}/berita/${params.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    other: {
      // Google News specific meta tags
      "news_keywords": article.tags?.map((t: { name: string }) => t.name).join(", ") || "",
      "article:published_time": article.publishedAt?.toISOString() || "",
      "article:modified_time": article.updatedAt.toISOString(),
      "article:author": article.author.name,
      "article:section": article.category.name,
    },
  };
}

/** Extract headings from HTML content for Table of Contents */
function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (text.length > 0) {
      const id = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 60);
      headings.push({ id, text, level: parseInt(match[1]) });
    }
  }
  return headings;
}

/** Inject IDs into headings so TOC anchor links work */
function injectHeadingIds(html: string): string {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const id = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 60);
    if (attrs.includes("id=")) return match; // already has ID
    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`;
  });
}

const WORDS_PER_PAGE = 300;
const TOLERANCE = 50;
const AD_INSERT_WORDS = 100; // inject ad after ~100 words
const AD_MIN_REMAINING = 80; // don't inject if less than 80 words remain
const AD_PLACEHOLDER = '<!--AD_SLOT-->';

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function injectInlineAds(html: string): string {
  if (!html) return html;

  const totalWords = countWords(html);
  if (totalWords < AD_INSERT_WORDS + AD_MIN_REMAINING) return html;

  const blocks = html.split(/(<br\s*\/?>(?:<br\s*\/?>)*|<\/p>\s*<p[^>]*>|<\/h[2-6]>\s*<h[2-6][^>]*>)/gi);
  let result = "";
  let wordCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockWords = countWords(block);

    result += block;
    wordCount += blockWords;

    if (wordCount >= AD_INSERT_WORDS) {
      // Check remaining words after this point
      const remaining = blocks.slice(i + 1).join("");
      const remainingWords = countWords(remaining);

      if (remainingWords >= AD_MIN_REMAINING) {
        result += AD_PLACEHOLDER;
        wordCount = 0;
      }
    }
  }

  return result;
}

function injectInternalLinks(html: string, related: any[]): string {
  if (!html || related.length === 0) return html;
  
  // Pisahkan blok berdasarkan paragraf
  const blocks = html.split(/(<\/p>)/gi);
  if (blocks.length < 5) return html; // Jika terlalu pendek, jangan inject
  
  let result = "";
  let injected = false;
  
  for (let i = 0; i < blocks.length; i++) {
    result += blocks[i];
    
    // Inject setelah paragraf ke-3
    if (blocks[i] === "</p>" && !injected && i >= 5) {
      result += `<div class="my-6 p-5 rounded-lg border-l-4 border-goto-green bg-surface-secondary shadow-sm">
        ${generateInternalLinksHtml(related)}
      </div>`;
      injected = true;
    }
  }
  
  return result;
}


function splitContentIntoPages(html: string): string[] {
  if (!html) return [html];

  const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const totalWords = textOnly.split(" ").filter(Boolean).length;

  if (totalWords <= WORDS_PER_PAGE + TOLERANCE) return [html];

  const blocks = html.split(/(<br\s*\/?>(?:<br\s*\/?>)*|<\/p>\s*<p[^>]*>|<\/h[2-6]>\s*<h[2-6][^>]*>)/gi);

  const pages: string[] = [];
  let currentPage = "";
  let currentWordCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockText = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const blockWords = blockText.split(" ").filter(Boolean).length;

    currentPage += block;
    currentWordCount += blockWords;

    if (currentWordCount >= WORDS_PER_PAGE && i < blocks.length - 1) {
      const remaining = blocks.slice(i + 1).join("");
      const remainingText = remaining.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const remainingWords = remainingText.split(" ").filter(Boolean).length;

      if (remainingWords > TOLERANCE) {
        pages.push(currentPage.trim());
        currentPage = "";
        currentWordCount = 0;
      }
    }
  }

  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages.length > 0 ? pages : [html];
}

export default async function ArticlePage({ params, searchParams }: { params: { slug: string }; searchParams: { page?: string } }) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  // Non-published articles are private — only visible to author/editors/admins
  const isPublished = article.status === "PUBLISHED";

  if (!isPublished) {
    // Check if current user has access
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || "";
    const isAuthor = session?.user?.id === article.authorId;
    const hasAccess = isAuthor || ["SUPER_ADMIN", "EDITOR"].includes(userRole);

    if (!hasAccess) {
      notFound();
    }
  }

  // Increment view count only for published articles
  if (isPublished) {
    await prisma.article.update({
      where: { slug: params.slug },
      data: { viewCount: { increment: 1 } },
    });
  }

  // Status label mapping for non-published preview
  const statusLabels: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "Draf", color: "bg-gray-500" },
    IN_REVIEW: { label: "Sedang Direview", color: "bg-yellow-500" },
    APPROVED: { label: "Disetujui — Menunggu Publikasi", color: "bg-blue-500" },
    REJECTED: { label: "Ditolak", color: "bg-red-500" },
    ARCHIVED: { label: "Diarsipkan", color: "bg-gray-600" },
  };

  // Resolve editor/reviewer name
  let editorName: string | null = null;
  if (article.reviewedBy) {
    const reviewer = await prisma.user.findUnique({
      where: { id: article.reviewedBy },
      select: { name: true },
    });
    editorName = reviewer?.name || null;
  }

  // Fetch related articles (same category, exclude current)
  const relatedArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      categoryId: article.categoryId,
      id: { not: article.id },
    },
    include: { author: true, category: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  // Fetch trending for sidebar
  const trendingArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true },
    orderBy: { viewCount: "desc" },
    take: 5,
  });

  const sidebarTrending = trendingArticles.map((a) => ({
    title: a.title,
    slug: a.slug,
    category: a.category.name,
    publishedAt: a.publishedAt
      ? new Date(a.publishedAt).toLocaleDateString("id-ID")
      : "",
    viewCount: a.viewCount,
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const articleUrl = `${appUrl}/berita/${params.slug}`;
  const contentPages = splitContentIntoPages(article.content);
  const totalPages = contentPages.length;
  const currentPage = Math.min(Math.max(1, parseInt(searchParams.page || "1") || 1), totalPages);
  // Inject ads per page (after pagination) so every page gets an ad in the middle
  let sanitizedContent = injectInlineAds(contentPages[currentPage - 1] || article.content);
  sanitizedContent = injectInternalLinks(sanitizedContent, relatedArticles);

  // Transform img with alt (caption) and title (source) into figure/figcaption
  sanitizedContent = sanitizedContent.replace(
    /<img\s+([^>]*?)\/?\s*>/g,
    (fullMatch: string, attrs: string) => {
      const altMatch = attrs.match(/alt="([^"]+)"/);
      if (!altMatch || !altMatch[1]) return fullMatch;
      const cap = altMatch[1];
      const titleMatch = attrs.match(/title="([^"]+)"/);
      const src = titleMatch?.[1];
      const captionHtml = src
        ? `${cap} <span class="img-source">— Sumber: ${src}</span>`
        : cap;
      return `<figure>${fullMatch}<figcaption>${captionHtml}</figcaption></figure>`;
    }
  );

  // Inject heading IDs for TOC anchor links
  sanitizedContent = injectHeadingIds(sanitizedContent);

  // Extract headings for Table of Contents
  const headings = extractHeadings(article.content);

  // Parse FAQ data (auto-generated on publish)
  let faqItems: { q: string; a: string }[] = [];
  try {
    if (article.faqData) faqItems = JSON.parse(article.faqData);
  } catch { /* ignore parse error */ }

  const plainContent = article.content.replace(/<[^>]*>/g, "");
  const wordCount = plainContent.split(/\s+/).filter(Boolean).length;

  // Count approved comments for engagement signal
  const commentCount = await prisma.comment.count({
    where: { articleId: article.id, isApproved: true },
  });

  // Full image URL for structured data
  const imageUrl = article.featuredImage
    ? (article.featuredImage.startsWith("http") ? article.featuredImage : `${appUrl}${article.featuredImage}`)
    : `${appUrl}/logo-jhb.png`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.seoTitle || article.title,
    alternativeHeadline: article.title,
    description: article.seoDescription || article.excerpt || "",
    image: [
      {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1200,
        height: 630,
      },
      {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1200,
        height: 1200,
      },
      {
        "@type": "ImageObject",
        url: imageUrl,
        width: 1200,
        height: 675,
      },
    ],
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: article.author.name,
      url: `${appUrl}/penulis/${slugify(article.author.name)}`,
      ...(article.author.bio && { description: article.author.bio }),
    },
    ...(editorName && {
      editor: {
        "@type": "Person",
        name: editorName,
      },
    }),
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "Jurnalis Hukum Bandung",
      url: appUrl,
      logo: {
        "@type": "ImageObject",
        url: `${appUrl}/logo-jhb.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://twitter.com/jurnalishukumbdg",
      ],
      publishingPrinciples: `${appUrl}/kode-etik`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category.name,
    articleBody: plainContent.slice(0, 500),
    keywords: article.tags?.map((t: { name: string }) => t.name).join(", ") || "",
    wordCount,
    commentCount,
    isAccessibleForFree: true,
    inLanguage: "id-ID",
    copyrightHolder: {
      "@type": "Organization",
      name: "Jurnalis Hukum Bandung",
    },
    copyrightYear: article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear(),
    // Google News: link article to the publication
    isPartOf: {
      "@type": ["CreativeWork", "Product"],
      name: "Jurnalis Hukum Bandung",
      productID: "jurnalishukumbandung.com:basic",
    },
    // Speakable — helps Google Assistant read key parts of news
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".article-content p:first-of-type"],
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Berita", item: `${appUrl}/berita` },
      { "@type": "ListItem", position: 3, name: article.category.name, item: `${appUrl}/kategori/${article.category.slug}` },
      { "@type": "ListItem", position: 4, name: article.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }}
      />
      {/* FAQPage schema — appears in Google "People Also Ask" */}
      {faqItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.a,
                },
              })),
            }),
          }}
        />
      )}
      <ReadingProgress />
      <CopyProtection
        authorName={article.author.name}
        articleUrl={articleUrl}
        articleTitle={article.title}
        categoryName={article.category.name}
        publishedAt={article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : ""}
      />

      <div className="bg-surface min-h-screen overflow-x-hidden">
        {/* Status banner for non-published articles */}
        {!isPublished && statusLabels[article.status] && (
          <div className={`${statusLabels[article.status].color} text-white`}>
            <div className="container-main flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider">Preview — {statusLabels[article.status].label}</span>
              </div>
              <span className="text-xs text-white/70">Halaman ini hanya dapat dilihat oleh pihak terkait</span>
            </div>
          </div>
        )}

        {/* Ad — Top leaderboard (only on published) */}
        {isPublished && <BannerAd size="slim" className="bg-surface-secondary" />}

        <div className="container-main py-8 overflow-hidden">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-txt-secondary" aria-label="Breadcrumb">
            <Link href="/" className="transition-colors hover:text-goto-green">Beranda</Link>
            <span>&gt;</span>
            <Link href={`/kategori/${article.category.slug}`} className="transition-colors hover:text-goto-green">
              {article.category.name}
            </Link>
            <span>&gt;</span>
            <span className="truncate max-w-[120px] sm:max-w-[200px] lg:max-w-[400px] text-txt-muted">{article.title}</span>
          </nav>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Article */}
            <article className="lg:col-span-2">
              {/* Print-only header */}
              <div className="print-header hidden">
                <img src="/logo-jhb.png" alt="JHB" />
                <div>
                  <div className="print-title">Jurnalis Hukum Bandung</div>
                  <div className="print-subtitle">Media Hukum Digital Terpercaya — jurnalishukumbandung.com</div>
                </div>
              </div>

              {/* Category badge & verification */}
              <div className="mb-4 flex items-center gap-3">
                <Link
                  href={`/kategori/${article.category.slug}`}
                  className="text-xs font-bold uppercase tracking-wide text-goto-green hover:underline"
                >
                  {article.category.name}
                </Link>
                {article.verificationLabel === "VERIFIED" && (
                  <span className="flex items-center gap-1 text-xs font-medium text-goto-green">
                    <CheckCircle size={12} /> Terverifikasi
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-serif text-2xl font-extrabold leading-tight text-txt-primary tracking-tight sm:text-3xl lg:text-4xl">
                {article.title}
              </h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="mt-3 text-lg text-txt-secondary">
                  {article.excerpt}
                </p>
              )}

              {/* Meta bar */}
              <div className="mt-4 text-sm text-txt-muted">
                <span>Penulis: <span className="text-txt-primary font-medium">{article.coAuthors ? "Tim Redaksi" : article.author.name}</span></span>
                {editorName && (
                  <>
                    <span className="mx-2">&middot;</span>
                    <span>Editor: <span className="text-txt-primary font-medium">{editorName}</span></span>
                  </>
                )}
                <span className="mx-2">&middot;</span>
                <span>
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                    : "-"}
                </span>
                <span className="mx-2">&middot;</span>
                <span>{article.readTime ?? 0} menit baca</span>
              </div>

              {/* Divider */}
              <div className="mt-6 h-px bg-border" />

              {/* Ad — below meta */}
              <div className="mt-6">
                <BannerAd slot="HEADER" noWrapper />
              </div>

              {/* Table of Contents — helps Google show sitelinks */}
              {headings.length >= 3 && (
                <nav className="toc mt-6 rounded-[12px] border border-border bg-surface-secondary p-5" aria-label="Daftar Isi">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-txt-primary mb-3">Daftar Isi</h2>
                  <ol className="space-y-1.5">
                    {headings.map((h, i) => (
                      <li key={i} className={h.level === 3 ? "ml-4" : ""}>
                        <a
                          href={`#${h.id}`}
                          className="text-sm text-goto-green hover:underline"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Featured Image — only show standalone if not already in content */}
              {article.featuredImage && !article.content?.includes(article.featuredImage) && (
                <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-[12px]">
                  <Image src={article.featuredImage} alt={article.title} fill className="object-cover" />
                </div>
              )}

              {/* Article content with inline ads */}
              <div className="mt-8 max-w-full overflow-hidden">
                {sanitizedContent.includes(AD_PLACEHOLDER) ? (
                  sanitizedContent.split(AD_PLACEHOLDER).map((chunk, i, arr) => (
                    <div key={i}>
                      <div
                        className="article-content text-base sm:text-[17px] leading-[1.8] break-words text-justify"
                        dangerouslySetInnerHTML={{ __html: chunk }}
                      />
                      {i < arr.length - 1 && (
                        <div className="my-6">
                          <BannerAd slot="IN_ARTICLE" noWrapper />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div
                    className="article-content text-base sm:text-[17px] leading-[1.8] break-words text-justify"
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  />
                )}
              </div>

              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="mt-8 rounded-[12px] border border-border bg-surface-secondary p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-txt-secondary">
                      Halaman <span className="font-bold text-txt-primary">{currentPage}</span> dari <span className="font-bold text-txt-primary">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPage > 1 && (
                        <Link
                          href={`/berita/${params.slug}?page=${currentPage - 1}`}
                          className="btn-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                        >
                          ←<span className="hidden sm:inline"> Sebelumnya</span>
                        </Link>
                      )}
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Link
                          key={i + 1}
                          href={`/berita/${params.slug}${i === 0 ? "" : `?page=${i + 1}`}`}
                          className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                            currentPage === i + 1
                              ? "bg-goto-green text-white"
                              : "hover:bg-surface-tertiary text-txt-secondary"
                          }`}
                        >
                          {i + 1}
                        </Link>
                      ))}
                      {currentPage < totalPages && (
                        <Link
                          href={`/berita/${params.slug}?page=${currentPage + 1}`}
                          className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Selanjutnya </span>→
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ad — after content */}
              <div className="mt-8">
                <BannerAd slot="IN_ARTICLE" noWrapper />
              </div>

              {/* Share bar + bookmark */}
              <div className="mt-8">
                <ShareBar articleUrl={articleUrl} articleTitle={article.title} />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <PrintButton />
                  <BookmarkButton slug={params.slug} />
                </div>
              </div>

              {/* Sources */}
              {article.sources.length > 0 && (
                <div className="mt-8 rounded-[12px] border border-border bg-surface p-6 shadow-card">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-txt-primary">
                    Sumber &amp; Narasumber
                  </h3>
                  <ul className="space-y-2">
                    {article.sources.map((source, i) => (
                      <li key={i} className="text-sm text-txt-secondary">
                        <strong className="text-txt-primary">{source.name}</strong>
                        {source.title && ` -- ${source.title}`}
                        {source.institution && `, ${source.institution}`}
                      </li>
                    ))}
                  </ul>
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

              {/* FAQ Section — "People Also Ask" SEO booster */}
              {faqItems.length > 0 && (
                <section className="mt-8 rounded-[12px] border border-border bg-surface p-6 shadow-card" aria-label="FAQ">
                  <h2 className="mb-4 text-base font-bold text-txt-primary sm:text-lg">
                    Pertanyaan yang Sering Diajukan
                  </h2>
                  <div className="space-y-4">
                    {faqItems.map((item, i) => (
                      <details key={i} className="group rounded-lg border border-border bg-surface-secondary">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-txt-primary hover:text-goto-green transition-colors">
                          {item.q}
                        </summary>
                        <p className="px-4 pb-4 text-sm leading-relaxed text-txt-secondary">
                          {item.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {/* Ad — after FAQ/tags */}
              <div className="mt-6">
                <BannerAd slot="BETWEEN_SECTIONS" noWrapper />
              </div>

              {/* Report button */}
              <div className="mt-8 border-t border-border pt-5">
                <Link href="/kontak?subject=Laporkan Berita" className="btn-ghost text-xs text-txt-secondary hover:text-red-600" aria-label="Laporkan berita ini">
                  <Flag size={13} aria-hidden="true" />
                  Laporkan Berita Ini
                </Link>
              </div>

              {/* Author box */}
              <div id="author" className="mt-8 rounded-[12px] border border-border bg-surface p-6 shadow-card">
                {article.coAuthors ? (
                  /* Tim Redaksi view */
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-goto-green text-lg font-bold text-white">
                        TR
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-txt-primary">Tim Redaksi</h3>
                        <p className="text-sm text-goto-green font-medium">Jurnalis Hukum Bandung</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg bg-surface-secondary p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">Penulis</p>
                      <div className="flex flex-wrap gap-2">
                        {article.coAuthors.split(",").map((name: string, i: number) => (
                          <Link
                            key={i}
                            href={`/penulis/${slugify(name.trim())}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1.5 text-sm font-medium text-txt-primary hover:border-goto-green hover:text-goto-green transition-colors"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-goto-green/10 text-[10px] font-bold text-goto-green">
                              {name.trim().charAt(0)}
                            </span>
                            {name.trim()}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single author view */
                  <div className="flex gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-goto-green text-xl font-bold text-white">
                      {article.author.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-txt-primary">{article.author.name}</h3>
                      <p className="text-sm text-goto-green font-medium">Jurnalis</p>
                      <p className="mt-2 text-sm leading-relaxed text-txt-secondary">
                        {article.author.bio}
                      </p>
                      <Link
                        href={`/penulis/${slugify(article.author.name)}`}
                        className="mt-3 inline-block text-sm font-medium text-goto-green transition-colors hover:text-goto-dark"
                      >
                        Lihat semua artikel &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Ad — before related */}
              <div className="mt-8">
                <BannerAd slot="FOOTER" noWrapper />
              </div>

              {/* Related articles */}
              {relatedArticles.length > 0 && (
                <section className="mt-10">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="border-l-[3px] border-goto-green pl-3 font-serif text-lg font-bold text-txt-primary">Artikel Terkait</h2>
                    <Link href={`/kategori/${article.category.slug}`} className="text-sm font-medium text-goto-green hover:underline">
                      Lihat Lainnya &rarr;
                    </Link>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {relatedArticles.map((related) => (
                      <div key={related.slug} className="shrink-0 w-[260px] sm:w-[280px]">
                        <ArticleCard {...related} variant="standard" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Comments — only on published articles */}
              {isPublished && <CommentSection articleId={article.id} />}

              {/* Print-only footer */}
              <div className="print-footer hidden">
                &copy; {new Date().getFullYear()} Jurnalis Hukum Bandung — jurnalishukumbandung.com
                <br />Artikel ini dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                <br />Sumber: {articleUrl}
              </div>
            </article>

            {/* Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <Sidebar trending={sidebarTrending} />
              <div className="mt-5">
                <SidebarAd />
              </div>
            </div>
          </div>
        </div>

        {/* Ad — Bottom full width */}
        <div className="py-8">
          <BannerAd size="leaderboard" className="bg-surface-secondary" />
        </div>
      </div>
    </>
  );
}

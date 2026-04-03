export const revalidate = 60; // ISR: revalidate homepage every 60 seconds

import Link from "next/link";
import Image from "next/image";
import ArticleCard from "@/components/artikel/ArticleCard";
import NewsTicker from "@/components/layout/NewsTicker";
import HeadlineSlider from "@/components/slider/HeadlineSlider";
import BreakingSlider from "@/components/slider/BreakingSlider";
import PopularCarousel from "@/components/slider/PopularCarousel";
import SubHeadlineSlider from "@/components/slider/SubHeadlineSlider";
import VideoStory from "@/components/slider/VideoStory";
import PollingCarousel from "@/components/slider/PollingCarousel";
import BannerAd, { SidebarAd } from "@/components/ads/BannerAd";
import ScrollableContainer from "@/components/layout/ScrollableContainer";
import { videoStoryData } from "@/lib/video-data";
import HorizontalScroll from "@/components/layout/HorizontalScroll";
import { Scale, BookOpen, Gavel, Shield, Users, Landmark, LucideIcon, Globe, Monitor, Building2, FileText, AlertTriangle, Radio,Calendar, Play, Vote, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";

const categoryIconMap: Record<string, LucideIcon> = {
  "hukum-pidana": Gavel,
  "hukum-perdata": Scale,
  "hukum-tata-negara": Landmark,
  "administrasi-negara": Building2,
  "korupsi-antikorupsi": AlertTriangle,
  "ham": Shield,
  "regulasi-kebijakan": FileText,
  "peradilan-lembaga": Landmark,
  "hukum-internasional": Globe,
  "hukum-digital": Monitor,
  "opini": BookOpen,
  "berita-bandung": Users,
};

const defaultIcon = Scale;

const liveSidangData = [
  { id: 1, title: "Sidang Praperadilan Kasus Korupsi Bandung Barat", court: "PN Bandung", time: "10:00 WIB", status: "Sedang Berlangsung", judge: "Majelis Hakim: Dr. H. Ahmad S., S.H., M.H." },
  { id: 2, title: "Sidang Lanjutan Sengketa Tanah Ciwidey", court: "PN Bale Bandung", time: "13:30 WIB", status: "Menunggu", judge: "Majelis Hakim: Hj. Siti R., S.H." },
  { id: 3, title: "Pembacaan Putusan Kasus Penipuan Online", court: "PN Bandung", time: "14:00 WIB", status: "Menunggu", judge: "Majelis Hakim: Drs. Bambang P., S.H., M.H." },
];

const pollingData = [
  {
    question: "Apakah Anda setuju dengan revisi UU ITE terbaru?",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
    options: [
      { label: "Sangat Setuju", percentage: 32 },
      { label: "Setuju", percentage: 28 },
      { label: "Netral", percentage: 18 },
      { label: "Tidak Setuju", percentage: 15 },
      { label: "Sangat Tidak Setuju", percentage: 7 },
    ],
    totalVotes: 2847,
  },
  {
    question: "Bagaimana penilaian Anda terhadap kinerja KPK saat ini?",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
    options: [
      { label: "Sangat Baik", percentage: 18 },
      { label: "Baik", percentage: 25 },
      { label: "Cukup", percentage: 30 },
      { label: "Buruk", percentage: 20 },
      { label: "Sangat Buruk", percentage: 7 },
    ],
    totalVotes: 4213,
  },
  {
    question: "Perlukah hukuman mati untuk koruptor di Indonesia?",
    image: "https://images.unsplash.com/photo-1453945619913-79ec89a82c51?w=600&q=80",
    options: [
      { label: "Sangat Perlu", percentage: 45 },
      { label: "Perlu", percentage: 22 },
      { label: "Netral", percentage: 15 },
      { label: "Tidak Perlu", percentage: 12 },
      { label: "Sangat Tidak Perlu", percentage: 6 },
    ],
    totalVotes: 6521,
  },
  {
    question: "Apakah sistem peradilan di Indonesia sudah adil?",
    image: "https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=600&q=80",
    options: [
      { label: "Sudah Adil", percentage: 12 },
      { label: "Cukup Adil", percentage: 23 },
      { label: "Netral", percentage: 20 },
      { label: "Kurang Adil", percentage: 30 },
      { label: "Tidak Adil", percentage: 15 },
    ],
    totalVotes: 3890,
  },
  {
    question: "Setujukah Anda dengan wacana restorative justice untuk kasus ringan?",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
    options: [
      { label: "Sangat Setuju", percentage: 38 },
      { label: "Setuju", percentage: 30 },
      { label: "Netral", percentage: 14 },
      { label: "Tidak Setuju", percentage: 12 },
      { label: "Sangat Tidak Setuju", percentage: 6 },
    ],
    totalVotes: 5120,
  },
  {
    question: "Bagaimana pendapat Anda tentang Omnibus Law Cipta Kerja?",
    image: "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=600&q=80",
    options: [
      { label: "Sangat Mendukung", percentage: 15 },
      { label: "Mendukung", percentage: 20 },
      { label: "Netral", percentage: 25 },
      { label: "Menolak", percentage: 28 },
      { label: "Sangat Menolak", percentage: 12 },
    ],
    totalVotes: 7340,
  },
];

const jadwalSidangData = [
  { date: "27 Mar", day: "Kamis", time: "09:00 WIB", cases: 12, highlight: "Sidang Tipikor Bupati Garut" },
  { date: "28 Mar", day: "Jumat", time: "10:00 WIB", cases: 8, highlight: "Putusan Sengketa Pilkada Jabar" },
  { date: "31 Mar", day: "Senin", time: "09:30 WIB", cases: 15, highlight: "Sidang Perdana Kasus Narkotika" },
  { date: "01 Apr", day: "Selasa", time: "13:00 WIB", cases: 10, highlight: "Mediasi Sengketa Tanah Lembang" },
  { date: "02 Apr", day: "Rabu", time: "10:00 WIB", cases: 7, highlight: "Sidang Lanjutan Kasus Penipuan Online" },
  { date: "03 Apr", day: "Kamis", time: "09:00 WIB", cases: 11, highlight: "Putusan Kasus Korupsi Dana Hibah" },
  { date: "04 Apr", day: "Jumat", time: "14:00 WIB", cases: 6, highlight: "Praperadilan Tersangka TPPU" },
];

export default async function HomePage() {
  const [articles, categories, trendingArticles, tickerArticles] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { author: true, category: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    prisma.category.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { order: "asc" },
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { author: true, category: true },
      orderBy: { viewCount: "desc" },
      take: 10,
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);

  const headlineArticles = articles.slice(0, 5);  // For headline slider
  const subHeadlines = articles.slice(5, 11);     // 6 items = 3 pages x 2 cards for sub-headline slider
  const breakingArticles = articles.slice(11, 16); // For breaking news slider
  const terkiniArticles = articles.slice(16, 24); // Berita Terkini: 2x4 grid = 8
  const restArticles = articles.slice(24);

  const tickerItems = tickerArticles.map((a) => ({
    title: a.title,
    slug: a.slug,
  }));

  // Group remaining articles by category
  const articlesByCategory: Record<string, { categorySlug: string; articles: typeof restArticles }> = {};
  for (const article of restArticles) {
    const catName = article.category.name;
    if (!articlesByCategory[catName]) {
      articlesByCategory[catName] = { categorySlug: article.category.slug, articles: [] };
    }
    if (articlesByCategory[catName].articles.length < 6) {
      articlesByCategory[catName].articles.push(article);
    }
  }
  const categoryEntries = Object.entries(articlesByCategory);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsMediaOrganization",
            name: "Jurnalis Hukum Bandung",
            url: "https://jurnalis-hukum-bandung.vercel.app",
            logo: {
              "@type": "ImageObject",
              url: "https://jurnalis-hukum-bandung.vercel.app/logo.png",
            },
            description: "Portal berita hukum terpercaya di Bandung. Menyajikan berita hukum pidana, perdata, tata negara, HAM, dan analisis hukum yang akurat dan terverifikasi.",
            sameAs: [],
            address: {
              "@type": "PostalAddress",
              addressLocality: "Bandung",
              addressRegion: "Jawa Barat",
              addressCountry: "ID",
            },
          }),
        }}
      />

      <NewsTicker items={tickerItems} />

      {/* Banner Ad — Leaderboard (above headline) */}
      <BannerAd size="slim" className="bg-surface" />

      {/* Headline News Slider + Breaking News */}
      <section className="bg-surface py-6">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Headline + Sub-headline stacked */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <HeadlineSlider items={JSON.parse(JSON.stringify(headlineArticles))} />
              {subHeadlines.length > 0 && (
                <SubHeadlineSlider items={JSON.parse(JSON.stringify(subHeadlines))} />
              )}
            </div>
            {/* Right column: Breaking + Sidebar Ad — side by side on mobile, stacked on desktop */}
            <div className="lg:col-span-1 grid grid-cols-7 lg:grid-cols-1 gap-3 lg:gap-4">
              <div className="col-span-4 lg:col-span-1">
                <BreakingSlider items={JSON.parse(JSON.stringify(breakingArticles))} />
              </div>
              <div className="col-span-3 lg:col-span-1 flex items-stretch">
                <SidebarAd />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Berita Terkini + Terpopuler side by side */}
      <section className="bg-surface py-8">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Berita Terkini — 2/3 width, grid layout */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-5">
                <Link href="/berita" className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary hover:text-goto-green transition-colors">
                  Berita Terkini
                </Link>
                <Link href="/berita" className="text-sm font-medium text-goto-green hover:underline">
                  Lihat Semua
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {terkiniArticles.map((a) => (
                  <ArticleCard key={a.slug} {...a} variant="standard" />
                ))}
              </div>
            </div>

            {/* Right: Berita Terpopuler — 1/3 width, vertical list */}
            {trendingArticles.length > 0 && (
              <div className="lg:col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <Link href="/berita?sort=popular" className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary flex items-center hover:text-goto-green transition-colors">
                    <TrendingUp size={18} className="mr-2 text-goto-green" />
                    Terpopuler
                  </Link>
                  <Link href="/berita?sort=popular" className="text-sm font-medium text-goto-green hover:underline">
                    Lihat Semua
                  </Link>
                </div>
                <div className="flex-1 flex flex-col divide-y divide-border">
                  {trendingArticles.slice(0, 8).map((article, i) => (
                    <div key={article.slug} className="group flex flex-1 items-center gap-3 py-3 first:pt-0">
                      {/* Rank number */}
                      <span className="shrink-0 w-8 text-center text-2xl font-extrabold text-goto-green select-none">
                        {i + 1}
                      </span>
                      {/* Thumbnail */}
                      <Link href={`/berita/${article.slug}`} className="shrink-0">
                        <div className="relative h-[80px] w-[115px] overflow-hidden rounded">
                          {article.featuredImage ? (
                            <Image
                              src={article.featuredImage}
                              alt={article.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-surface-tertiary" />
                          )}
                        </div>
                      </Link>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/berita/${article.slug}`}>
                          <h3 className="text-sm font-bold leading-snug text-txt-primary line-clamp-2 group-hover:text-goto-green transition-colors">
                            {article.title}
                          </h3>
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-txt-muted">
                          <span className="text-goto-green font-semibold">{article.category.name}</span>
                          <span className="h-2.5 w-px bg-border" />
                          <span>{article.viewCount?.toLocaleString("id-ID")} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Banner Ad — full width */}
      <BannerAd size="leaderboard" className="bg-surface-secondary" />

      {/* Jadwal Sidang Mendatang */}
      <section className="bg-surface py-6">
        <div className="container-main">
          <div className="flex items-center justify-between mb-4">
            <Link href="/jadwal-sidang" className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary flex items-center hover:text-goto-green transition-colors">
              <Calendar size={18} className="mr-2 text-goto-green" />
              Jadwal Sidang Mendatang
            </Link>
            <Link href="/jadwal-sidang" className="text-sm font-medium text-goto-green hover:underline">
              Lihat Semua
            </Link>
          </div>
          <HorizontalScroll>
            {jadwalSidangData.map((j) => (
              <div key={j.date} className="shrink-0 w-[calc(100vw-48px)] sm:w-[260px] md:w-[300px] rounded-lg border border-border bg-surface-secondary p-4 hover:border-goto-green/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-goto-green text-white">
                    <span className="text-lg font-extrabold leading-none">{j.date.split(" ")[0]}</span>
                    <span className="text-[9px] font-medium uppercase">{j.date.split(" ")[1]}</span>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-txt-primary">{j.day}</span>
                    <span className="block text-xs text-txt-muted">{j.cases} perkara</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-txt-primary leading-snug line-clamp-2">{j.highlight}</p>
                <p className="text-xs font-semibold text-goto-green mt-1.5">{j.time}</p>
              </div>
            ))}
          </HorizontalScroll>
        </div>
      </section>

      <div className="border-b border-border" />

      {/* Live Sidang — Video + Info Cards */}
      <section className="bg-surface-secondary py-6">
        <div className="container-main">
          <div className="flex items-center justify-between mb-4">
            <Link href="/live-sidang" className="border-l-[3px] border-red-500 pl-3 text-lg font-bold text-txt-primary flex items-center hover:text-red-500 transition-colors">
              <Radio size={18} className="mr-2 text-red-500 animate-pulse" />
              Live Sidang Hari Ini
            </Link>
            <Link href="/live-sidang" className="text-sm font-medium text-goto-green hover:underline">
              Lihat Semua
            </Link>
          </div>

          {/* Video Player */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-dark mb-5">
            {/* Placeholder — ganti dengan iframe YouTube/embed nanti */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-600/30 cursor-pointer hover:bg-red-500 transition-colors">
                <Play size={24} className="text-white ml-0.5" />
              </div>
              <p className="mt-4 text-white font-bold text-sm sm:text-lg text-center px-4">Sidang Praperadilan Kasus Korupsi Bandung Barat</p>
              <p className="mt-1 text-white/50 text-xs sm:text-sm text-center px-4">PN Bandung &middot; Majelis Hakim: Dr. H. Ahmad S., S.H., M.H.</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
                <span className="text-xs text-white/40">Dimulai pukul 10:00 WIB</span>
              </div>
            </div>
          </div>

          {/* 3 Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveSidangData.map((sidang) => (
              <div key={sidang.id} className="rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-txt-secondary">{sidang.court}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    sidang.status === "Sedang Berlangsung"
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-100 text-txt-secondary"
                  }`}>
                    {sidang.status === "Sedang Berlangsung" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                    {sidang.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-txt-primary leading-snug">{sidang.title}</h3>
                <p className="text-xs text-txt-muted mt-1">{sidang.judge}</p>
                <p className="text-xs font-semibold text-goto-green mt-2">{sidang.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Polling Hukum */}
      <section className="bg-surface py-8">
        <div className="container-main">
          <div className="flex items-center justify-between mb-5">
            <h2 className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary flex items-center cursor-default">
              <Vote size={18} className="mr-2 text-goto-green" />
              Polling Hukum
            </h2>
          </div>
          <PollingCarousel />
        </div>
      </section>

      {/* Banner Ad — above Video Story */}
      <BannerAd size="slim" className="bg-surface" />

      {/* Video Story — horizontal scroll */}
      <section className="bg-surface-secondary py-8">
        <div className="container-main">
          <div className="flex items-center justify-between mb-5">
            <Link href="/video" className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary flex items-center hover:text-goto-green transition-colors">
              <Play size={18} className="mr-2 text-goto-green" />
              Video Story
            </Link>
            <Link href="/video" className="text-sm font-medium text-goto-green hover:underline flex items-center gap-1">
              Lihat Semua &rarr;
            </Link>
          </div>
          <VideoStory items={videoStoryData} />
        </div>
      </section>

      {/* Banner Ad — In-Article */}
      <BannerAd slot="IN_ARTICLE" className="bg-surface" />

      <div className="border-b border-border" />

      {/* Category Sections — Kumparan-style layout */}
      {categoryEntries.map(([categoryName, { categorySlug, articles: catArticles }], idx) => {
        const featured = catArticles[0];
        const trending = catArticles.slice(1, 4);
        const terbaru = catArticles.slice(4, 7);

        return (
          <section
            key={categorySlug}
            className={`py-8 ${idx % 2 === 0 ? "bg-surface" : "bg-surface-secondary"}`}
          >
            <div className="container-main">
              {/* Section header */}
              <div className="flex items-center justify-between mb-5">
                <Link href={`/kategori/${categorySlug}`} className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary hover:text-goto-green transition-colors">
                  {categoryName}
                </Link>
                <Link
                  href={`/kategori/${categorySlug}`}
                  className="text-sm font-medium text-goto-green hover:underline"
                >
                  Lihat lainnya &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Featured article — compact landscape */}
                {featured && (
                  <div className="lg:col-span-1">
                    <Link href={`/berita/${featured.slug}`} className="group block">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-dark">
                        {featured.featuredImage ? (
                          <Image
                            src={featured.featuredImage}
                            alt={featured.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-surface-tertiary" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="text-base font-bold leading-snug text-white line-clamp-2">
                            {featured.title}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
                            <span className="text-goto-green font-semibold">{featured.author.name}</span>
                            <span>{featured.publishedAt ? new Date(featured.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                {/* Center: Trending — scrollable list */}
                {trending.length > 0 && (
                  <div className="lg:col-span-1">
                    <Link href={`/kategori/${categorySlug}`} className="border-l-[3px] border-goto-green pl-3 text-sm font-bold text-txt-primary mb-3 block hover:text-goto-green transition-colors">
                      Trending di {categoryName}
                    </Link>
                    <div className="space-y-0 divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-hide">
                      {trending.map((a) => (
                        <div key={a.slug} className="group flex gap-3 py-2.5 first:pt-0">
                          {a.featuredImage && (
                            <Link href={`/berita/${a.slug}`} className="shrink-0">
                              <div className="relative h-[56px] w-[80px] overflow-hidden rounded">
                                <Image src={a.featuredImage} alt={a.title} fill className="object-cover" />
                              </div>
                            </Link>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/berita/${a.slug}`}>
                              <h4 className="text-[13px] font-bold text-txt-primary leading-snug line-clamp-2 group-hover:text-goto-green transition-colors">
                                {a.title}
                              </h4>
                            </Link>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-txt-muted">
                              <span className="text-goto-green font-semibold">{a.author.name}</span>
                              <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Right: Terbaru */}
                {terbaru.length > 0 && (
                  <div className="lg:col-span-1">
                    <Link href={`/kategori/${categorySlug}`} className="border-l-[3px] border-goto-green pl-3 text-sm font-bold text-txt-primary mb-3 block hover:text-goto-green transition-colors">
                      Terbaru di {categoryName}
                    </Link>
                    <div className="space-y-0 divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-hide">
                      {terbaru.map((a) => (
                        <div key={a.slug} className="group flex gap-3 py-2.5 first:pt-0">
                          {a.featuredImage && (
                            <Link href={`/berita/${a.slug}`} className="shrink-0">
                              <div className="relative h-[56px] w-[80px] overflow-hidden rounded">
                                <Image src={a.featuredImage} alt={a.title} fill className="object-cover" />
                              </div>
                            </Link>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/berita/${a.slug}`}>
                              <h4 className="text-[13px] font-bold text-txt-primary leading-snug line-clamp-2 group-hover:text-goto-green transition-colors">
                                {a.title}
                              </h4>
                            </Link>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-txt-muted">
                              <span className="text-goto-green font-semibold">{a.author.name}</span>
                              <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : ""}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      {/* Banner Ad — Footer */}
      <BannerAd slot="FOOTER" className="bg-surface" />

      {/* Kategori Links — DATA REAL */}
      <section className="bg-surface-secondary py-8">
        <div className="container-main">
          <div className="flex items-center justify-between mb-5">
            <h2 className="border-l-[3px] border-goto-green pl-3 text-lg font-bold text-txt-primary">
              Kategori
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {categories.map((cat) => {
              const Icon = categoryIconMap[cat.slug] || defaultIcon;
              return (
                <Link
                  key={cat.slug}
                  href={`/kategori/${cat.slug}`}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-all duration-200 hover:border-goto-green/40 hover:shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-goto-light text-goto-green">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-txt-primary truncate group-hover:text-goto-green transition-colors">
                      {cat.name}
                    </span>
                    <span className="block text-[10px] text-txt-muted">{cat._count.articles} artikel</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

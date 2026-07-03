import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Suspense } from "react";
import TopLoader from "@/components/layout/TopLoader";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import LiveBanner from "@/components/layout/LiveBanner";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import IosSplashScreens from "@/components/pwa/IosSplashScreens";
import ZoomCompensator from "@/components/layout/ZoomCompensator";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ConsentInit from "@/components/ConsentInit";
import CookieConsent from "@/components/CookieConsent";
import AdSense from "@/components/ads/AdSense";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00AA13",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com"
  ),
  verification: {
    google: ["aOYlnEshfJKwCD4v8OePC3vgPACRIRt2bO5s9dziFj0", "9pGu6p81BOnwuPMxHzHwo-Zgq8IvgYLmfLvJMjXDsus"],
    other: { "msvalidate.01": "2A1E21A418146AC61D34F9F4BE1E70C9" },
  },
  title: {
    default: "Hukum Bandung — Berita Hukum Terbaru & Terpercaya | Jurnalis Hukum Bandung",
    template: "%s | Jurnalis Hukum Bandung",
  },
  description:
    "Hukum Bandung terkini — portal berita hukum terpercaya di Bandung dan Jawa Barat. Liputan sidang, analisis hukum pidana, perdata, tata negara, HAM, dan informasi pengadilan Bandung terlengkap.",
  keywords: [
    "hukum bandung",
    "berita hukum bandung",
    "berita hukum",
    "hukum bandung terbaru",
    "pengadilan bandung",
    "sidang bandung",
    "hukum pidana bandung",
    "hukum perdata bandung",
    "hukum tata negara",
    "HAM bandung",
    "advokat bandung",
    "berita hukum jawa barat",
    "jurnalis hukum bandung",
    "kasus hukum bandung",
    "pengacara bandung",
  ],
  authors: [{ name: "Jurnalis Hukum Bandung" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Jurnalis Hukum Bandung",
    title: "Hukum Bandung — Berita Hukum Terbaru & Terpercaya",
    description: "Portal berita hukum Bandung terpercaya. Liputan sidang, analisis hukum pidana, perdata, HAM, dan informasi pengadilan Bandung terlengkap.",
    images: [{ url: "/logo-jhb.png", width: 512, height: 512, alt: "Jurnalis Hukum Bandung — Portal Berita Hukum Bandung" }],
  },
  twitter: {
    card: "summary",
    site: "@jurnalishukumbdg",
    creator: "@jurnalishukumbdg",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://jurnalishukumbandung.com",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "JHB News",
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  // Organization + WebSite structured data for Google Knowledge Panel & Sitelinks Search Box
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": `${appUrl}/#organization`,
    name: "Jurnalis Hukum Bandung",
    alternateName: ["JHB", "Hukum Bandung", "Berita Hukum Bandung"],
    url: appUrl,
    logo: {
      "@type": "ImageObject",
      url: `${appUrl}/logo-jhb.png`,
      width: 512,
      height: 512,
    },
    description: "Portal berita hukum Bandung terpercaya. Menyajikan berita hukum Bandung terbaru — hukum pidana, perdata, tata negara, HAM, sidang pengadilan, dan analisis hukum di Bandung dan Jawa Barat.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/jurnalishukumbdg",
      "https://kartawarta.com",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bandung",
      addressRegion: "Jawa Barat",
      addressCountry: "ID",
    },
    publishingPrinciples: `${appUrl}/kode-etik`,
    ethicsPolicy: `${appUrl}/kode-etik`,
    correctionsPolicy: `${appUrl}/pedoman-media`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial",
      url: `${appUrl}/kontak`,
    },
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${appUrl}/#website`,
    name: "Jurnalis Hukum Bandung",
    alternateName: "Hukum Bandung",
    url: appUrl,
    publisher: { "@id": `${appUrl}/#organization` },
    inLanguage: "id-ID",
    // Sitelinks Search Box — enables search box directly in Google results
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="id" className={`${sourceSans.variable} ${lora.variable}`}>
      <head>
        {/* Consent Mode v2 default — HARUS sebelum script Google apa pun (GA/AdSense) */}
        <ConsentInit />
        {/* Resource hints — faster font & API loading = better Core Web Vitals */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload critical brand asset for instant header render */}
        <link rel="preload" as="image" href="/logo-jhb.webp" type="image/webp" fetchPriority="high" />
        {/* iOS PWA splash screens — Add to Home Screen */}
        <IosSplashScreens />
      </head>
      <body className="flex min-h-screen flex-col font-sans bg-surface text-txt-primary">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationLd, websiteLd]) }}
        />
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[200] focus:bg-goto-green focus:text-white focus:px-4 focus:py-2 focus:text-sm"
          >
            Langsung ke konten
          </a>
          <Suspense fallback={null}>
            <TopLoader />
          </Suspense>
          {/* Global LIVE banner — visible di semua halaman saat ada live session aktif */}
          <Suspense fallback={null}>
            <LiveBanner />
          </Suspense>
          <PublicNav />
          <main id="main-content" className="flex-1">{children}</main>
          <PublicFooter />
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <ZoomCompensator />
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          {/* Loader Google AdSense (Auto Ads + global adsbygoogle untuk <AdUnit />) */}
          <AdSense />
          {/* Banner persetujuan cookie — men-trigger consent 'update' untuk iklan personalized */}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

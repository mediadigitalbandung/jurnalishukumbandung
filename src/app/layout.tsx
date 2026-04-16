import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Suspense } from "react";
import TopLoader from "@/components/layout/TopLoader";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import ZoomCompensator from "@/components/layout/ZoomCompensator";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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

export const viewport = { width: "device-width", initialScale: 1 };

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
    icon: "/logo-jhb.png",
    apple: "/logo-jhb.png",
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
    "google-site-verification": "aOYlnEshfJKwCD4v8OePC3vgPACRIRt2bO5s9dziFj0",
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
        {/* Resource hints — faster font & API loading = better Core Web Vitals */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
          <PublicNav />
          <main id="main-content" className="flex-1">{children}</main>
          <PublicFooter />
          <ServiceWorkerRegistration />
          <ZoomCompensator />
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}

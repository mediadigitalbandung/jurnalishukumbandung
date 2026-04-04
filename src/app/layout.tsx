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
    process.env.NEXT_PUBLIC_APP_URL || "https://jurnalis-hukum-bandung.vercel.app"
  ),
  verification: {
    google: ["aOYlnEshfJKwCD4v8OePC3vgPACRIRt2bO5s9dziFj0", "9pGu6p81BOnwuPMxHzHwo-Zgq8IvgYLmfLvJMjXDsus"],
  },
  title: {
    default: "Jurnalis Hukum Bandung - Media Hukum Digital Terpercaya",
    template: "%s | Jurnalis Hukum Bandung",
  },
  description:
    "Portal berita hukum terpercaya di Bandung. Menyajikan berita hukum pidana, perdata, tata negara, HAM, dan analisis hukum yang akurat dan terverifikasi.",
  keywords: [
    "berita hukum",
    "hukum bandung",
    "jurnalis hukum",
    "berita hukum bandung",
    "hukum pidana",
    "hukum perdata",
    "hukum tata negara",
    "HAM",
    "pengadilan bandung",
    "advokat bandung",
    "berita hukum jawa barat",
  ],
  authors: [{ name: "Jurnalis Hukum Bandung" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Jurnalis Hukum Bandung",
    images: [{ url: "/logo-jhb.png", width: 512, height: 512, alt: "Jurnalis Hukum Bandung" }],
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
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${sourceSans.variable} ${lora.variable}`}>
      <body className="flex min-h-screen flex-col font-sans bg-surface text-txt-primary">
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
        </Providers>
      </body>
    </html>
  );
}

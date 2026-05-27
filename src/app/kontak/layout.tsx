import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description: "Hubungi redaksi Jurnalis Hukum Bandung untuk pertanyaan, saran, atau kerja sama.",
  alternates: { canonical: "https://jurnalishukumbandung.com/kontak" },
};

const appUrl = "https://jurnalishukumbandung.com";

const contactLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Hubungi Jurnalis Hukum Bandung",
  url: `${appUrl}/kontak`,
  mainEntity: {
    "@type": "NewsMediaOrganization",
    "@id": `${appUrl}/#organization`,
    name: "Jurnalis Hukum Bandung",
    url: appUrl,
    email: "redaksi@jurnalishukumbandung.com",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "editorial",
        email: "redaksi@jurnalishukumbandung.com",
        availableLanguage: ["id"],
        areaServed: "ID",
      },
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "redaksi@jurnalishukumbandung.com",
        availableLanguage: ["id"],
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bandung",
      addressRegion: "Jawa Barat",
      addressCountry: "ID",
    },
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Beranda", item: appUrl },
    { "@type": "ListItem", position: 2, name: "Hubungi Kami", item: `${appUrl}/kontak` },
  ],
};

export default function KontakLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([contactLd, breadcrumbLd]) }}
      />
      {children}
    </>
  );
}

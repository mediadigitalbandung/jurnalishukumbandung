export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { Shield, Eye, Users, Award, CheckCircle2, BookOpen, AlertTriangle, Mail, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export const metadata: Metadata = {
  title: "Tentang Kami — Jurnalis Hukum Bandung",
  description:
    "Jurnalis Hukum Bandung — media digital hukum terpercaya untuk Bandung & Jawa Barat. Pelajari visi, kebijakan editorial, proses fact-checking, dan tim redaksi kami.",
  keywords: "tentang jurnalis hukum bandung, kebijakan editorial, fact-checking, kode etik jurnalistik, media hukum bandung",
  alternates: { canonical: `${APP_URL}/tentang` },
  openGraph: {
    title: "Tentang Jurnalis Hukum Bandung",
    description:
      "Media digital hukum terpercaya untuk Bandung & Jawa Barat. Visi, editorial policy, dan proses fact-checking.",
    type: "website",
    url: `${APP_URL}/tentang`,
    siteName: "Jurnalis Hukum Bandung",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

async function getSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ["contact_email", "alamat_redaksi", "website_url", "redaksi_phone"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    email: map.contact_email || "redaksi@jurnalishukumbandung.com",
    phone: map.redaksi_phone || "",
    alamat: map.alamat_redaksi || "Bandung, Jawa Barat, Indonesia",
    website: map.website_url || "jurnalishukumbandung.com",
  };
}

export default async function TentangPage() {
  const contact = await getSettings();

  // Get key team members for E-E-A-T signal
  const team = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SUPER_ADMIN", "EDITOR"] } },
    select: { name: true, role: true, specialization: true, bio: true },
    take: 6,
  });

  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Tentang Jurnalis Hukum Bandung",
    url: `${APP_URL}/tentang`,
    description: "Profil dan kebijakan editorial Jurnalis Hukum Bandung — media hukum digital di Bandung dan Jawa Barat.",
    mainEntity: {
      "@type": "NewsMediaOrganization",
      "@id": `${APP_URL}/#organization`,
      name: "Jurnalis Hukum Bandung",
      alternateName: ["JHB", "Hukum Bandung"],
      url: APP_URL,
      logo: {
        "@type": "ImageObject",
        url: `${APP_URL}/logo-jhb.png`,
        width: 512,
        height: 512,
      },
      foundingDate: "2024",
      description:
        "Media digital hukum terpercaya untuk wilayah Bandung dan Jawa Barat. Menyajikan berita hukum akurat, terverifikasi, dan berimbang.",
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.alamat,
        addressLocality: "Bandung",
        addressRegion: "Jawa Barat",
        addressCountry: "ID",
      },
      email: contact.email,
      ...(contact.phone && { telephone: contact.phone }),
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "editorial",
          email: contact.email,
          availableLanguage: ["id", "en"],
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: contact.email,
          availableLanguage: "id",
        },
      ],
      publishingPrinciples: `${APP_URL}/kode-etik`,
      ethicsPolicy: `${APP_URL}/kode-etik`,
      correctionsPolicy: `${APP_URL}/pedoman-media`,
      diversityPolicy: `${APP_URL}/tentang`,
      missionCoveragePrioritiesPolicy: `${APP_URL}/tentang`,
      verificationFactCheckingPolicy: `${APP_URL}/tentang#fact-checking`,
      actionableFeedbackPolicy: `${APP_URL}/kontak`,
      areaServed: [
        { "@type": "City", name: "Bandung" },
        { "@type": "City", name: "Cimahi" },
        { "@type": "AdministrativeArea", name: "Bandung Barat" },
        { "@type": "AdministrativeArea", name: "Kabupaten Bandung" },
        { "@type": "State", name: "Jawa Barat" },
      ],
      knowsAbout: [
        "Hukum Pidana", "Hukum Perdata", "Hukum Tata Negara",
        "HAM", "Peradilan", "Hukum Indonesia", "Korupsi", "Tipikor",
      ],
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Tentang Kami", item: `${APP_URL}/tentang` },
    ],
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([aboutLd, breadcrumbLd]) }}
      />
      <div className="container-main py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
            <span className="block h-8 w-[3px] rounded-full bg-goto-green" />
            Tentang Jurnalis Hukum Bandung
          </h1>

          <div className="mt-8 space-y-6 font-serif text-[17px] leading-relaxed text-txt-secondary">
            <p>
              <strong className="text-txt-primary">Jurnalis Hukum Bandung</strong> adalah media digital yang berfokus pada pemberitaan
              hukum di wilayah Bandung Raya dan Jawa Barat. Didirikan tahun 2024 dengan visi menjadi sumber informasi
              hukum yang terpercaya, akurat, dan berimbang bagi masyarakat.
            </p>
            <p>
              Kami percaya bahwa akses terhadap informasi hukum yang berkualitas adalah hak setiap warga negara.
              Melalui jurnalisme investigatif dan analisis mendalam, kami menyajikan berita hukum yang
              tidak hanya informatif, tetapi juga edukatif — sesuai dengan Kode Etik Jurnalistik (KEJ) dan
              Pedoman Pemberitaan Media Siber Dewan Pers.
            </p>
            <p>
              Tim redaksi kami terdiri dari jurnalis berpengalaman dengan latar belakang pendidikan hukum
              dan jurnalistik. Setiap artikel melalui proses verifikasi berlapis sebelum dipublikasikan.
            </p>
          </div>

          {/* Core values */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {[
              { icon: Shield, title: "Akurat & Terverifikasi", desc: "Setiap berita melalui proses fact-checking berlapis dan verifikasi minimal 2 sumber sebelum dipublikasikan." },
              { icon: Eye, title: "Transparan", desc: "Kami terbuka terhadap koreksi publik dan selalu mencantumkan sumber primer dalam setiap artikel." },
              { icon: Users, title: "Berimbang", desc: "Kami menyajikan berita dari berbagai perspektif (cover both sides) tanpa memihak salah satu pihak." },
              { icon: Award, title: "Profesional", desc: "Tim redaksi mematuhi Kode Etik Jurnalistik (KEJ) dan Pedoman Pemberitaan Media Siber Dewan Pers." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[12px] border border-border bg-surface p-6">
                  <Icon size={24} className="text-goto-green" />
                  <h3 className="mt-3 font-bold text-txt-primary">{item.title}</h3>
                  <p className="mt-1 text-sm text-txt-secondary">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Editorial policy */}
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl">
              <BookOpen size={24} className="text-goto-green" />
              Kebijakan Editorial
            </h2>
            <div className="mt-4 space-y-3 text-[15px] text-txt-secondary leading-relaxed">
              <p>
                Seluruh konten Jurnalis Hukum Bandung diproduksi dengan mengacu pada UU No. 40 Tahun 1999 tentang Pers,
                Kode Etik Jurnalistik (KEJ) Dewan Pers, dan Pedoman Pemberitaan Media Siber.
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Setiap fakta diverifikasi melalui minimal <strong className="text-txt-primary">dua sumber independen</strong>.</li>
                <li>Pemberitaan hukum mengedepankan <strong className="text-txt-primary">asas praduga tak bersalah</strong>.</li>
                <li>Identitas korban (terutama anak dan kekerasan seksual) <strong className="text-txt-primary">disamarkan</strong>.</li>
                <li>Penulisan menghindari opini personal — fokus pada fakta dan kutipan langsung narasumber.</li>
                <li>Konflik kepentingan diungkapkan secara transparan dalam disclosure di bawah artikel.</li>
              </ul>
              <p className="pt-2">
                Pelajari selengkapnya di <Link href="/kode-etik" className="text-goto-green hover:underline">Kode Etik</Link>.
              </p>
            </div>
          </section>

          {/* Fact-checking process */}
          <section className="mt-12" id="fact-checking">
            <h2 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl">
              <CheckCircle2 size={24} className="text-goto-green" />
              Proses Fact-Checking
            </h2>
            <div className="mt-4 space-y-3 text-[15px] text-txt-secondary leading-relaxed">
              <p>Setiap artikel melalui 4 tahap verifikasi:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li><strong className="text-txt-primary">Verifikasi sumber</strong> — Minimal 2 sumber independen yang dapat dipertanggungjawabkan.</li>
                <li><strong className="text-txt-primary">Cross-check dokumen</strong> — Bukti dokumen pengadilan, BAP, atau putusan diverifikasi keasliannya.</li>
                <li><strong className="text-txt-primary">Right of reply</strong> — Pihak yang disebutkan diberi kesempatan klarifikasi sebelum publikasi.</li>
                <li><strong className="text-txt-primary">Editorial review</strong> — Editor senior melakukan review akhir sebelum artikel terbit.</li>
              </ol>
              <p className="pt-2">
                Jika menemukan kesalahan, mohon laporkan ke <a href={`mailto:${contact.email}`} className="text-goto-green hover:underline">{contact.email}</a> — kami akan menanggapi dalam 2x24 jam dan mempublikasikan koreksi terbuka jika diperlukan.
              </p>
            </div>
          </section>

          {/* Corrections policy */}
          <section className="mt-12">
            <h2 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl">
              <AlertTriangle size={24} className="text-goto-green" />
              Kebijakan Koreksi
            </h2>
            <div className="mt-4 space-y-3 text-[15px] text-txt-secondary leading-relaxed">
              <p>
                Apabila terdapat kesalahan faktual dalam artikel kami, koreksi akan dilakukan secara transparan:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Koreksi minor (typo, ejaan): diperbaiki dengan label <em>[Diperbarui]</em>.</li>
                <li>Koreksi mayor (fakta): diperbaiki dengan disclosure di akhir artikel + tanggal koreksi.</li>
                <li>Hak jawab dan hak koreksi dijamin sesuai UU Pers.</li>
              </ul>
              <p>
                Lihat selengkapnya di <Link href="/pedoman-media" className="text-goto-green hover:underline">Pedoman Media Siber</Link>.
              </p>
            </div>
          </section>

          {/* Team */}
          {team.length > 0 && (
            <section className="mt-12">
              <h2 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl">
                <Users size={24} className="text-goto-green" />
                Tim Redaksi
              </h2>
              <p className="mt-3 text-[15px] text-txt-secondary">
                Lihat <Link href="/redaksi" className="text-goto-green hover:underline">seluruh susunan redaksi</Link> kami.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {team.slice(0, 4).map((m) => (
                  <div key={m.name} className="rounded-[10px] border border-border bg-surface p-4">
                    <p className="font-semibold text-txt-primary">{m.name}</p>
                    <p className="text-xs text-txt-muted mt-0.5">{m.role.replace(/_/g, " ")}</p>
                    {m.specialization && (
                      <p className="text-xs text-goto-green mt-1">{m.specialization}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact */}
          <section className="mt-12 rounded-[12px] border border-border bg-surface-secondary p-6" id="kontak">
            <h2 className="flex items-center gap-2 text-lg font-bold text-txt-primary">
              <Mail size={20} className="text-goto-green" />
              Informasi Kontak
            </h2>
            <div className="mt-3 space-y-2 text-sm text-txt-secondary">
              <p className="flex items-start gap-2">
                <MapPin size={16} className="text-txt-muted flex-shrink-0 mt-0.5" />
                <span><strong className="text-txt-primary">Alamat Redaksi:</strong> {contact.alamat}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-txt-muted flex-shrink-0" />
                <span><strong className="text-txt-primary">Email:</strong> <a href={`mailto:${contact.email}`} className="text-goto-green hover:underline">{contact.email}</a></span>
              </p>
              <p><strong className="text-txt-primary">Website:</strong> {contact.website}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

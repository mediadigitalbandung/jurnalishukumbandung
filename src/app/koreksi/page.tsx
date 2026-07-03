import { Metadata } from "next";
import { AlertCircle, Mail, Scale, RefreshCw, ShieldCheck } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export const metadata: Metadata = {
  title: "Kebijakan Koreksi & Ralat",
  description:
    "Kebijakan koreksi, ralat, dan hak jawab Jurnalis Hukum Bandung. Prosedur pengajuan koreksi berita, tenggat penanganan, dan komitmen transparansi editorial.",
  alternates: { canonical: `${APP_URL}/koreksi` },
  openGraph: {
    title: "Kebijakan Koreksi & Ralat — Jurnalis Hukum Bandung",
    description:
      "Prosedur koreksi berita, ralat, dan hak jawab sesuai Kode Etik Jurnalistik dan Pedoman Pemberitaan Media Siber Dewan Pers.",
    type: "website",
    url: `${APP_URL}/koreksi`,
    siteName: "Jurnalis Hukum Bandung",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

const steps = [
  {
    title: "Ajukan permohonan",
    text: "Kirim email ke redaksi@jurnalishukumbandung.com dengan subjek “KOREKSI” atau “HAK JAWAB”, sertakan tautan (URL) berita, bagian yang keliru, dan data/dokumen pendukung yang benar.",
  },
  {
    title: "Verifikasi redaksi",
    text: "Redaksi memeriksa keberatan Anda terhadap fakta, sumber, dan dokumen asli. Bila terbukti terdapat kekeliruan, koreksi diproses tanpa dikenai biaya.",
  },
  {
    title: "Penerbitan koreksi",
    text: "Koreksi atau ralat ditayangkan pada artikel yang sama, disertai catatan koreksi yang transparan mencantumkan tanggal dan bagian yang diperbaiki. Hak jawab dimuat secara proporsional.",
  },
];

const principles = [
  {
    icon: RefreshCw,
    title: "Koreksi Segera",
    text: "Kami segera mencabut, meralat, dan memperbaiki berita yang keliru atau tidak akurat disertai permintaan maaf kepada pembaca (Pasal 10 Kode Etik Jurnalistik).",
  },
  {
    icon: Scale,
    title: "Hak Jawab & Hak Koreksi",
    text: "Kami melayani hak jawab dan hak koreksi secara proporsional bagi setiap pihak yang dirugikan oleh pemberitaan (Pasal 11 Kode Etik Jurnalistik).",
  },
  {
    icon: ShieldCheck,
    title: "Transparansi Perubahan",
    text: "Setiap koreksi material atas artikel yang telah tayang ditandai secara jelas dengan catatan koreksi, sehingga jejak perubahan tetap dapat ditelusuri pembaca.",
  },
];

export default function KoreksiPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${APP_URL}/koreksi#webpage`,
    name: "Kebijakan Koreksi & Ralat",
    url: `${APP_URL}/koreksi`,
    description:
      "Kebijakan koreksi, ralat, dan hak jawab Jurnalis Hukum Bandung sesuai Kode Etik Jurnalistik dan Pedoman Pemberitaan Media Siber Dewan Pers.",
    isPartOf: { "@type": "WebSite", name: "Jurnalis Hukum Bandung", url: APP_URL },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "Jurnalis Hukum Bandung",
      url: APP_URL,
      // Google News: correctionsPolicy adalah sinyal kepercayaan editorial.
      correctionsPolicy: `${APP_URL}/koreksi`,
      ethicsPolicy: `${APP_URL}/kode-etik`,
      diversityPolicy: `${APP_URL}/pedoman-media`,
    },
  };

  return (
    <div className="bg-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="container-main py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="flex items-center gap-3 text-xl font-bold text-txt-primary sm:text-2xl lg:text-3xl">
            <span className="block h-8 w-[3px] rounded-full bg-goto-green" />
            Kebijakan Koreksi &amp; Ralat
          </h1>

          <p className="mt-6 font-serif text-[17px] leading-relaxed text-txt-secondary">
            Jurnalis Hukum Bandung berkomitmen menyajikan berita yang akurat dan dapat
            dipertanggungjawabkan. Kami menyadari bahwa kekeliruan dapat terjadi. Karena itu, kami
            membuka ruang koreksi, ralat, dan hak jawab bagi seluruh pembaca dan narasumber sesuai
            <strong className="text-txt-primary"> Kode Etik Jurnalistik</strong> dan
            <strong className="text-txt-primary"> Pedoman Pemberitaan Media Siber</strong> Dewan Pers.
          </p>

          {/* Prinsip */}
          <div className="mt-10 space-y-4">
            {principles.map((p) => (
              <div
                key={p.title}
                className="flex gap-4 rounded-[12px] border border-border bg-surface p-5 shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-goto-light">
                  <p.icon className="h-5 w-5 text-goto-green" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="font-bold text-txt-primary">{p.title}</h2>
                  <p className="mt-1 text-[15px] leading-relaxed text-txt-secondary">{p.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prosedur */}
          <h2 className="mt-12 flex items-center gap-2 text-lg font-bold text-txt-primary">
            <AlertCircle className="h-5 w-5 text-goto-green" />
            Cara Mengajukan Koreksi atau Hak Jawab
          </h2>
          <div className="mt-6 space-y-5">
            {steps.map((s, i) => (
              <div key={s.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-goto-green text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-txt-primary">{s.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-txt-secondary">{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tenggat */}
          <div className="mt-10 rounded-[12px] border border-goto-green/20 bg-goto-light p-5">
            <p className="text-sm leading-relaxed text-goto-dark">
              <strong>Tenggat penanganan:</strong> Redaksi menindaklanjuti setiap permohonan koreksi
              dalam waktu <strong>maksimal 2&times;24 jam kerja</strong> sejak permohonan diterima.
              Untuk keberatan yang membutuhkan verifikasi dokumen lebih lanjut, kami akan
              menginformasikan perkembangannya kepada pemohon.
            </p>
          </div>

          {/* Kontak */}
          <div className="mt-6 flex flex-col gap-3 rounded-[12px] border border-border bg-surface-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-txt-primary">Ajukan koreksi atau hak jawab</p>
              <p className="text-sm text-txt-muted">Kami menghargai setiap masukan untuk akurasi pemberitaan.</p>
            </div>
            <a
              href="mailto:redaksi@jurnalishukumbandung.com?subject=KOREKSI%20-%20"
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              <Mail size={16} />
              redaksi@jurnalishukumbandung.com
            </a>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-txt-muted">
            Dasar hukum: Undang-Undang Nomor 40 Tahun 1999 tentang Pers; Peraturan Dewan Pers tentang
            Kode Etik Jurnalistik; serta Pedoman Pemberitaan Media Siber. Bila penyelesaian tidak
            tercapai, sengketa pemberitaan dapat diadukan ke Dewan Pers.
          </p>
        </div>
      </div>
    </div>
  );
}

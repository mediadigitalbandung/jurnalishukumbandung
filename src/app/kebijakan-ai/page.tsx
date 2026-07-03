import { Metadata } from "next";
import { Bot, UserCheck, ClipboardCheck, Scale, ShieldAlert } from "lucide-react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export const metadata: Metadata = {
  title: "Kebijakan Penggunaan Kecerdasan Buatan (AI)",
  description:
    "Bagaimana Jurnalis Hukum Bandung menggunakan kecerdasan buatan (AI) sebagai alat bantu redaksi, dengan pengawasan dan tanggung jawab editorial oleh jurnalis manusia.",
  alternates: { canonical: `${APP_URL}/kebijakan-ai` },
  openGraph: {
    title: "Kebijakan Penggunaan AI — Jurnalis Hukum Bandung",
    description:
      "Transparansi penggunaan AI: setiap konten yang dibantu AI tetap melalui verifikasi dan tanggung jawab editorial manusia.",
    type: "website",
    url: `${APP_URL}/kebijakan-ai`,
    siteName: "Jurnalis Hukum Bandung",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

const principles = [
  {
    icon: UserCheck,
    title: "Selalu Ada Pengawasan Manusia",
    text: "Tidak ada berita yang tayang tanpa ditinjau editor. AI hanya membantu proses; keputusan penerbitan, akurasi, dan tanggung jawab hukum sepenuhnya berada di tangan redaksi.",
  },
  {
    icon: ClipboardCheck,
    title: "Verifikasi Fakta Tetap Wajib",
    text: "Setiap fakta, kutipan, nama, tanggal, dan pasal hukum yang disusun dengan bantuan AI diverifikasi ulang terhadap sumber primer sebelum dipublikasikan.",
  },
  {
    icon: Scale,
    title: "Tanggung Jawab Editorial",
    text: "Penanggung jawab redaksi bertanggung jawab penuh atas seluruh konten, termasuk yang proses penyusunannya dibantu AI, sesuai UU Pers dan Kode Etik Jurnalistik.",
  },
  {
    icon: ShieldAlert,
    title: "Batasan Penggunaan",
    text: "AI tidak digunakan untuk merekayasa foto/video peristiwa, memalsukan kutipan narasumber, atau membuat berita tanpa dasar fakta. Ilustrasi yang dihasilkan AI diberi keterangan bila digunakan.",
  },
];

const useCases = [
  "Membantu menyusun draf awal, ringkasan, dan penyederhanaan bahasa hukum agar mudah dipahami.",
  "Membantu riset pendukung, penataan struktur artikel, dan pembuatan judul serta metadata.",
  "Membantu transkripsi, penerjemahan, dan pembuatan cuplikan untuk media sosial.",
  "Membantu memeriksa ejaan, tata bahasa, dan konsistensi gaya penulisan.",
];

export default function KebijakanAiPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${APP_URL}/kebijakan-ai#webpage`,
    name: "Kebijakan Penggunaan Kecerdasan Buatan (AI)",
    url: `${APP_URL}/kebijakan-ai`,
    description:
      "Transparansi penggunaan AI di Jurnalis Hukum Bandung: AI sebagai alat bantu dengan pengawasan dan tanggung jawab editorial manusia.",
    isPartOf: { "@type": "WebSite", name: "Jurnalis Hukum Bandung", url: APP_URL },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "Jurnalis Hukum Bandung",
      url: APP_URL,
      ethicsPolicy: `${APP_URL}/kode-etik`,
      correctionsPolicy: `${APP_URL}/koreksi`,
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
            Kebijakan Penggunaan Kecerdasan Buatan (AI)
          </h1>

          <div className="mt-6 flex items-start gap-3 rounded-[12px] border border-goto-green/20 bg-goto-light p-5">
            <Bot className="mt-0.5 h-6 w-6 shrink-0 text-goto-green" strokeWidth={2.2} />
            <p className="font-serif text-[17px] leading-relaxed text-goto-dark">
              Jurnalis Hukum Bandung memanfaatkan teknologi kecerdasan buatan (AI) sebagai
              <strong> alat bantu</strong> untuk meningkatkan kecepatan dan kualitas kerja redaksi.
              Namun, <strong>setiap konten tetap melewati peninjauan dan tanggung jawab jurnalis
              manusia</strong>. AI tidak menggantikan peran editor dalam memverifikasi fakta dan
              menjaga integritas pemberitaan.
            </p>
          </div>

          {/* Prinsip */}
          <h2 className="mt-12 text-lg font-bold text-txt-primary">Prinsip Kami</h2>
          <div className="mt-6 space-y-4">
            {principles.map((p) => (
              <div
                key={p.title}
                className="flex gap-4 rounded-[12px] border border-border bg-surface p-5 shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-goto-light">
                  <p.icon className="h-5 w-5 text-goto-green" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-bold text-txt-primary">{p.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-txt-secondary">{p.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Penggunaan */}
          <h2 className="mt-12 text-lg font-bold text-txt-primary">
            Untuk Apa Saja AI Digunakan
          </h2>
          <ul className="mt-5 space-y-3">
            {useCases.map((u) => (
              <li key={u} className="flex gap-3 text-[15px] leading-relaxed text-txt-secondary">
                <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-goto-green" />
                {u}
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-[12px] border border-border bg-surface-secondary p-5">
            <p className="text-sm leading-relaxed text-txt-muted">
              Kebijakan ini merupakan bagian dari komitmen transparansi kami dan akan diperbarui
              seiring perkembangan teknologi serta pedoman dari Dewan Pers. Pertanyaan mengenai
              penggunaan AI dapat diajukan ke{" "}
              <a href="mailto:redaksi@jurnalishukumbandung.com" className="text-goto-green hover:underline">
                redaksi@jurnalishukumbandung.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

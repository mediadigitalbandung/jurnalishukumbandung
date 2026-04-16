import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, BarChart3, Users, Zap, Mail, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Pasang Iklan",
  description: "Pasang iklan di Jurnalis Hukum Bandung — media hukum digital terpercaya. Jangkau pembaca profesional hukum di Bandung.",
  alternates: { canonical: "https://jurnalishukumbandung.com/iklan" },
};

const adSlots = [
  { name: "Header Banner", size: "728 × 180 px", position: "Di atas konten utama", price: "Hubungi kami" },
  { name: "Sidebar", size: "300 × 500 px", position: "Kolom kanan halaman artikel", price: "Hubungi kami" },
  { name: "Dalam Artikel", size: "728 × 180 px", position: "Di tengah konten artikel", price: "Hubungi kami" },
  { name: "Antar Seksi", size: "970 × 300 px", position: "Di antara seksi homepage", price: "Hubungi kami" },
  { name: "Footer Banner", size: "728 × 180 px", position: "Di bawah konten", price: "Hubungi kami" },
  { name: "Pop-up", size: "600 × 400 px", position: "Overlay di tengah layar", price: "Hubungi kami" },
  { name: "Floating Bottom", size: "728 × 180 px", position: "Sticky di bawah layar", price: "Hubungi kami" },
];

const benefits = [
  { icon: Users, title: "Audiens Tepat Sasaran", desc: "Pembaca kami adalah profesional hukum, advokat, mahasiswa hukum, dan masyarakat yang peduli isu hukum." },
  { icon: BarChart3, title: "Laporan Statistik", desc: "Dapatkan laporan tayangan dan klik iklan Anda secara real-time melalui dashboard." },
  { icon: Zap, title: "Setup Cepat", desc: "Iklan Anda bisa tayang dalam hitungan menit setelah materi disetujui." },
  { icon: CheckCircle, title: "Media Terverifikasi", desc: "Jurnalis Hukum Bandung adalah media hukum digital yang terdaftar dan terverifikasi." },
];

export default function IklanPage() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <section className="bg-[#1C1C1E] py-16 sm:py-24">
        <div className="container-main text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-goto-green/20 px-4 py-1.5 text-xs font-bold text-goto-green uppercase tracking-wider mb-6">
            Pasang Iklan
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Jangkau Pembaca<br />
            <span className="text-goto-green">Profesional Hukum</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Iklankan bisnis, jasa, atau layanan hukum Anda di media hukum digital terpercaya Bandung.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#kontak" className="btn-primary px-8 py-3.5 text-base font-semibold">
              Hubungi Tim Iklan
            </a>
            <a href="#slot" className="btn-outline-green px-8 py-3 text-base font-semibold">
              Lihat Slot Iklan
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-12 sm:py-16">
        <div className="container-main">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-txt-primary mb-10">
            Kenapa Beriklan di <span className="text-goto-green">JHB</span>?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="rounded-[12px] border border-border bg-surface p-6 text-center hover:shadow-card-hover transition-shadow">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-goto-light">
                    <Icon size={22} className="text-goto-green" />
                  </div>
                  <h3 className="font-bold text-txt-primary text-base mb-2">{b.title}</h3>
                  <p className="text-sm text-txt-secondary">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ad Slots */}
      <section id="slot" className="bg-surface-secondary py-12 sm:py-16">
        <div className="container-main">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-txt-primary mb-3">
            Slot Iklan Tersedia
          </h2>
          <p className="text-center text-txt-secondary mb-10 max-w-xl mx-auto">
            Pilih posisi iklan yang sesuai dengan kebutuhan kampanye Anda
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adSlots.map((slot) => (
              <a href="#kontak" key={slot.name} className="block group rounded-[12px] border border-border bg-surface p-5 hover:border-goto-green/40 hover:shadow-card-hover transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-txt-primary">{slot.name}</h3>
                  <span className="rounded-full bg-goto-light px-3 py-0.5 text-xs font-bold text-goto-green">{slot.size}</span>
                </div>
                <p className="text-sm text-txt-secondary mb-3">{slot.position}</p>
                <p className="text-sm font-semibold text-goto-green group-hover:underline">{slot.price}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16">
        <div className="container-main">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-txt-primary mb-10">
            Cara Memasang Iklan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Hubungi Kami", desc: "Kirim email atau WhatsApp dengan detail kebutuhan iklan Anda." },
              { step: "2", title: "Kirim Materi", desc: "Kirimkan banner/gambar iklan sesuai ukuran slot yang dipilih." },
              { step: "3", title: "Iklan Tayang", desc: "Iklan Anda tayang dan bisa dipantau melalui laporan statistik." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-goto-green text-2xl font-extrabold text-white">
                  {s.step}
                </div>
                <h3 className="font-bold text-txt-primary text-base mb-2">{s.title}</h3>
                <p className="text-sm text-txt-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="kontak" className="bg-[#1C1C1E] py-12 sm:py-16">
        <div className="container-main">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Tertarik Beriklan?
            </h2>
            <p className="text-white/60 mb-8">
              Hubungi tim iklan kami untuk konsultasi dan penawaran harga.
            </p>
            <div className="space-y-4">
              <a
                href="mailto:iklan@jurnalishukumbandung.com"
                className="flex items-center justify-center gap-3 rounded-[12px] border border-white/10 bg-white/5 px-6 py-4 text-white hover:bg-white/10 transition-colors"
              >
                <Mail size={20} className="text-goto-green" />
                <span className="text-base font-medium">iklan@jurnalishukumbandung.com</span>
              </a>
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 rounded-[12px] border border-white/10 bg-white/5 px-6 py-4 text-white hover:bg-white/10 transition-colors"
              >
                <Phone size={20} className="text-goto-green" />
                <span className="text-base font-medium">WhatsApp: 0812-3456-7890</span>
              </a>
            </div>
            <p className="mt-6 text-xs text-white/30">
              Atau kunjungi halaman <Link href="/kontak" className="text-goto-green hover:underline">Kontak Redaksi</Link> untuk informasi lebih lanjut.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Mail, MapPin, Scale, Instagram, Facebook, Youtube, Twitter, Linkedin } from "lucide-react";
import NotificationBell from "@/components/pwa/NotificationBell";

// Akun media sosial resmi redaksi. Ubah URL di sini bila akun berubah.
const socialLinks = [
  { name: "Instagram", href: "https://instagram.com/jurnalishukumbandung", Icon: Instagram, hover: "hover:bg-pink-600" },
  { name: "Facebook", href: "https://facebook.com/jurnalishukumbandung", Icon: Facebook, hover: "hover:bg-blue-600" },
  { name: "YouTube", href: "https://youtube.com/@jurnalishukumbandung", Icon: Youtube, hover: "hover:bg-red-600" },
  { name: "TikTok", href: "https://tiktok.com/@jurnalishukumbandung", Icon: TikTokIcon, hover: "hover:bg-black" },
  { name: "X (Twitter)", href: "https://x.com/jurnalishukumbdg", Icon: Twitter, hover: "hover:bg-neutral-900" },
  { name: "WhatsApp", href: "https://wa.me/6281234567890", Icon: WhatsAppIcon, hover: "hover:bg-green-600" },
  { name: "LinkedIn", href: "https://linkedin.com/company/jurnalishukumbandung", Icon: Linkedin, hover: "hover:bg-sky-700" },
];

function TikTokIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 3c.4 2.3 1.8 3.9 4 4.1v2.7c-1.4.1-2.7-.3-4-1v6.4c0 3.6-2.6 5.8-5.7 5.8C7.6 21 5 18.6 5 15.4c0-3 2.4-5.4 5.6-5.1v2.8c-.4-.1-.9-.2-1.3-.1-1.3.2-2.1 1.2-2 2.6.1 1.3 1.1 2.1 2.4 2 1.3-.1 2-1 2-2.4V3h2.8z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.9.8.8-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-.9 2.1-.1 3.4a9.3 9.3 0 0 0 3.7 3.4c1.4.6 1.9.7 2.6.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

const footerLinks = {
  tentang: [
    { name: "Tentang Kami", href: "/tentang" },
    { name: "Redaksi", href: "/redaksi" },
    { name: "Kode Etik", href: "/kode-etik" },
    { name: "Pedoman Media", href: "/pedoman-media" },
    { name: "Koreksi & Ralat", href: "/koreksi" },
    { name: "Kebijakan AI", href: "/kebijakan-ai" },
  ],
  kontak: [
    { name: "Kontak Redaksi", href: "/kontak" },
    { name: "Bookmark Saya", href: "/bookmark" },
    { name: "Kebijakan Privasi", href: "/privasi" },
    { name: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
    { name: "Pasang Iklan", href: "/kontak" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-surface-dark text-white" role="contentinfo" aria-label="Footer situs">
      <div className="container-main py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center gap-3.5">
              <Image src="/logo-jhb.png" alt="Logo JHB" width={52} height={52} className="rounded-full" />
              <div>
                <span className="block text-xl font-bold tracking-tight">Jurnalis Hukum</span>
                <span className="block text-sm text-white/50">Bandung</span>
              </div>
            </div>

            {/* Editorial tagline */}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-goto-green">
              Independen &middot; Berimbang &middot; Bertanggung Jawab
            </p>

            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">
              Portal berita hukum Bandung terpercaya. Menyajikan berita hukum terbaru, liputan sidang, analisis hukum pidana, perdata, dan informasi pengadilan di Bandung dan Jawa Barat.
            </p>

            {/* Contact info */}
            <div className="mt-4 space-y-1.5">
              <a href="mailto:redaksi@jurnalishukumbandung.com" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
                <Mail size={12} />
                redaksi@jurnalishukumbandung.com
              </a>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <MapPin size={12} />
                Bandung, Jawa Barat, Indonesia
              </div>
            </div>

            {/* Media sosial */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                Ikuti Kami
              </p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(({ name, href, Icon, hover }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors duration-200 hover:text-white ${hover}`}
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Push notification opt-in (whole block hides if denied/unsupported) */}
            <NotificationBell
              wrapperClassName="mt-5"
              heading={
                <p className="mb-2 text-xs font-semibold text-white/70">
                  Dapatkan notifikasi breaking news
                </p>
              }
            />

            {/* Verifikasi Dewan Pers */}
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20">
                <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-base font-bold text-white tracking-tight">
                  Terverifikasi Dewan Pers
                </p>
                <p className="text-xs text-white/50">
                  Sertifikat No. 608/DP-Verifikasi/K/XI/2020
                </p>
              </div>
            </div>
          </div>

          {/* Tentang */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Tentang
            </h4>
            <ul className="space-y-2">
              {footerLinks.tentang.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors duration-200 hover:text-goto-green"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Layanan
            </h4>
            <ul className="space-y-2">
              {footerLinks.kontak.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors duration-200 hover:text-goto-green"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer editorial */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/4 px-5 py-4">
            <Scale size={16} className="mt-0.5 shrink-0 text-white/30" />
            <p className="text-xs leading-relaxed text-white/35">
              <span className="font-semibold text-white/50">Disclaimer:</span>{" "}
              Seluruh konten di portal ini merupakan karya jurnalistik yang disusun berdasarkan fakta dan verifikasi. Konten tidak dimaksudkan sebagai nasihat atau konsultasi hukum profesional. Untuk keperluan hukum, konsultasikan dengan advokat atau penasihat hukum yang kompeten.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Jurnalis Hukum Bandung — Portal Berita Hukum Bandung Terpercaya
            </p>
            <p className="text-xs text-white/40">
              Anggota{" "}
              <span className="font-medium text-white/60">Dewan Pers Indonesia</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

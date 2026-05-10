"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Mail, MapPin, Scale } from "lucide-react";
import NotificationBell from "@/components/pwa/NotificationBell";

const footerLinks = {
  tentang: [
    { name: "Tentang Kami", href: "/tentang" },
    { name: "Redaksi", href: "/redaksi" },
    { name: "Kode Etik", href: "/kode-etik" },
    { name: "Pedoman Media", href: "/pedoman-media" },
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

            {/* Push notification opt-in */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-white/70">
                Dapatkan notifikasi breaking news
              </p>
              <NotificationBell />
            </div>

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

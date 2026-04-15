"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center gap-2.5">
              <Image src="/logo-jhb.png" alt="Logo JHB" width={36} height={36} className="rounded-full" />
              <span className="text-base font-bold">Jurnalis Hukum Bandung</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
              Media hukum digital terpercaya untuk wilayah Bandung dan sekitarnya.
            </p>

            {/* Verifikasi Dewan Pers */}
            <div className="mt-5 inline-flex items-center gap-3.5 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-5 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-base font-bold leading-tight text-white">
                  Terverifikasi Dewan Pers
                </p>
                <p className="mt-0.5 text-sm leading-tight text-blue-200/70">
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
              Kontak
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

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Jurnalis Hukum Bandung. Seluruh hak cipta dilindungi.
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

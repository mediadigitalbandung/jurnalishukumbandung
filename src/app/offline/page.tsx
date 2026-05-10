"use client";

import Image from "next/image";
import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="bg-surface flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      <Link href="/" aria-label="Kembali ke beranda Jurnalis Hukum Bandung">
        <Image
          src="/logo-jhb.webp"
          alt="Logo Jurnalis Hukum Bandung"
          width={72}
          height={72}
          className="mb-6 rounded-sm opacity-80"
          priority
        />
      </Link>

      <div className="bg-goto-light mb-5 flex h-16 w-16 items-center justify-center rounded-full">
        <WifiOff className="text-goto-green h-8 w-8" aria-hidden="true" />
      </div>

      <h1 className="text-txt-primary mb-3 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        Anda Sedang Offline
      </h1>

      <p className="text-txt-secondary mb-8 max-w-sm text-base">
        Koneksi internet tidak tersedia. Konten yang sudah Anda kunjungi sebelumnya
        mungkin masih tersimpan di perangkat Anda. Silakan coba lagi nanti.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={() => window.location.reload()}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Coba Lagi
        </button>
        <Link href="/" className="btn-secondary flex items-center gap-2">
          <Home className="h-4 w-4" aria-hidden="true" />
          Beranda
        </Link>
      </div>

      <p className="text-txt-muted mt-10 text-xs">
        jurnalishukumbandung.com — Portal Berita Hukum Bandung
      </p>
    </div>
  );
}

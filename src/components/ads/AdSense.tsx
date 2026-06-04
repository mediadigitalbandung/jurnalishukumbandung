"use client";

import Script from "next/script";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Loader AdSense (mengaktifkan Auto Ads + menyediakan global `adsbygoogle` untuk AdUnit).
 *
 * Dipasang sekali di root layout. Hanya termuat bila NEXT_PUBLIC_ADSENSE_CLIENT diisi,
 * jadi aman di-deploy sebelum akun AdSense disetujui. Auto Ads diaktifkan dari dashboard
 * AdSense; manual unit dirender lewat <AdUnit />.
 */
export default function AdSense() {
  if (!CLIENT) return null;

  return (
    <Script
      id="adsbygoogle-loader"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdUnitProps {
  /** data-ad-slot dari dashboard AdSense (angka). */
  slot: string;
  /** data-ad-format. "auto" = responsive default. */
  format?: string;
  /** data-full-width-responsive. */
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Manual AdSense ad unit (<ins class="adsbygoogle">).
 *
 * Butuh loader <AdSense /> sudah terpasang di layout. Aman dipakai di mana saja
 * (header/sidebar/in-article). Tidak merender apa pun bila env client belum diisi.
 */
export default function AdUnit({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  style,
}: AdUnitProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // loader belum siap / sudah terisi — diabaikan, AdSense retry sendiri
    }
  }, []);

  if (!CLIENT) return null;

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block", ...style }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}

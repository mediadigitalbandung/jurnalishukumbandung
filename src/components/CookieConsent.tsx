"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "jhb-consent";

type Choice = "granted" | "denied";

function applyConsent(choice: Choice) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const value = choice === "granted" ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

/**
 * Banner persetujuan cookie (UU PDP / Consent Mode v2).
 *
 * ConsentInit sudah men-set default 'denied' di <head>. Komponen ini menampilkan banner
 * saat user belum memilih, lalu memanggil gtag('consent','update', ...) dan menyimpan
 * pilihan di localStorage. Tanpa komponen ini, consent tidak pernah jadi 'granted' →
 * AdSense hanya tayang iklan non-personalized.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage diblokir (private mode) — tampilkan banner, jangan crash.
    }
    if (stored !== "granted" && stored !== "denied") {
      setVisible(true);
    }
  }, []);

  function choose(choice: Choice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // abaikan kalau storage diblokir
    }
    applyConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Persetujuan cookie"
      className="fixed inset-x-0 bottom-0 z-[150] px-4 pb-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <p className="flex-1 text-sm text-txt-secondary">
          Kami menggunakan cookie untuk analitik dan menampilkan iklan yang relevan.
          Dengan menekan &ldquo;Terima&rdquo;, Anda menyetujui penggunaan cookie sesuai{" "}
          <Link href="/privasi" className="text-goto-green underline">
            Kebijakan Privasi
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-primary transition hover:bg-surface-secondary"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-full bg-goto-green px-5 py-2 text-sm font-semibold text-white transition hover:bg-goto-dark"
          >
            Terima
          </button>
        </div>
      </div>
    </div>
  );
}

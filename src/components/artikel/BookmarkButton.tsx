"use client";

import { useState, useEffect } from "react";
import { Bookmark, WifiOff, Loader2 } from "lucide-react";
import { isOfflineReady } from "@/lib/offline-cache";

interface Props {
  slug: string;
  /** Optional featured image URL — gets cached for offline reading */
  featuredImage?: string | null;
}

const STORAGE_KEY = "bookmarks";

export default function BookmarkButton({ slug, featuredImage }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [offlineReady, setReady]    = useState(false);

  useEffect(() => {
    const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const isBm = stored.includes(slug);
    setBookmarked(isBm);
    if (isBm) checkOfflineReady();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const articleUrl = typeof window !== "undefined"
    ? `${window.location.origin}/berita/${slug}`
    : `/berita/${slug}`;

  async function checkOfflineReady() {
    setReady(await isOfflineReady(articleUrl));
  }

  async function notifyServiceWorker(type: "CACHE_ARTICLE" | "UNCACHE_ARTICLE") {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({
        type,
        url: articleUrl,
        imageUrl: featuredImage || undefined,
      });
    } catch {
      /* ignore */
    }
  }

  async function toggleBookmark() {
    setBusy(true);
    const stored: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const isCurrently = stored.includes(slug);

    const updated = isCurrently
      ? stored.filter((s) => s !== slug)
      : [...stored, slug];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBookmarked(!isCurrently);

    if (!isCurrently) {
      await notifyServiceWorker("CACHE_ARTICLE");
      // Give SW a moment to populate cache, then re-check
      setTimeout(checkOfflineReady, 1500);
    } else {
      await notifyServiceWorker("UNCACHE_ARTICLE");
      setReady(false);
    }
    setBusy(false);
  }

  const label = bookmarked
    ? offlineReady ? "Tersimpan offline" : "Disimpan"
    : "Bookmark";

  return (
    <button
      onClick={toggleBookmark}
      disabled={busy}
      className={`btn-ghost flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${
        bookmarked ? "bg-goto-light text-goto-green" : "text-txt-secondary hover:text-goto-green"
      }`}
      title={bookmarked
        ? offlineReady
          ? "Artikel tersedia offline. Klik untuk hapus."
          : "Disimpan, sedang menyiapkan untuk offline..."
        : "Simpan & download untuk dibaca offline"}
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : bookmarked && offlineReady ? (
        <WifiOff size={14} className="fill-goto-green/20 text-goto-green" />
      ) : (
        <Bookmark size={14} className={bookmarked ? "fill-goto-green" : ""} />
      )}
      {label}
    </button>
  );
}

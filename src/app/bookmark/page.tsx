"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Trash2, ArrowLeft, WifiOff, Download } from "lucide-react";
import { getPageCache } from "@/lib/offline-cache";

interface BookmarkedArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  publishedAt?: string | null;
  author?: { name: string };
  category?: { name: string; slug: string };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BookmarkPage() {
  const [articles, setArticles] = useState<BookmarkedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [offlineSlugs, setOfflineSlugs] = useState<Set<string>>(new Set());
  const [downloading, setDownloading]   = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    setBookmarks(stored);

    if (stored.length === 0) {
      setLoading(false);
      return;
    }

    fetch("/api/articles/by-slugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: stored }),
    })
      .then((res) => res.json())
      .then((json) => {
        setArticles(json.data || []);
      })
      .catch(() => {
        // silent fail
      })
      .finally(() => setLoading(false));
  }, []);

  // Detect which bookmarks are already cached for offline reading
  useEffect(() => {
    if (articles.length === 0) return;
    (async () => {
      const cache = await getPageCache();
      if (!cache) return;
      const ready = new Set<string>();
      for (const a of articles) {
        const url = `${window.location.origin}/berita/${a.slug}`;
        if (await cache.match(url)) ready.add(a.slug);
      }
      setOfflineSlugs(ready);
    })();
  }, [articles]);

  function removeBookmark(slug: string) {
    const updated = bookmarks.filter((s) => s !== slug);
    setBookmarks(updated);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
    setArticles((prev) => prev.filter((a) => a.slug !== slug));
    // Remove from cache too
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const article = articles.find((a) => a.slug === slug);
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          type: "UNCACHE_ARTICLE",
          url: `${window.location.origin}/berita/${slug}`,
          imageUrl: article?.featuredImage || undefined,
        });
      });
    }
  }

  async function downloadAllForOffline() {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    setDownloading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      for (const a of articles) {
        if (offlineSlugs.has(a.slug)) continue;
        reg.active?.postMessage({
          type: "CACHE_ARTICLE",
          url: `${window.location.origin}/berita/${a.slug}`,
          imageUrl: a.featuredImage || undefined,
        });
      }
      // Wait then re-check
      setTimeout(async () => {
        const cache = await getPageCache();
        if (cache) {
          const ready = new Set<string>();
          for (const a of articles) {
            if (await cache.match(`${window.location.origin}/berita/${a.slug}`)) {
              ready.add(a.slug);
            }
          }
          setOfflineSlugs(ready);
        }
        setDownloading(false);
      }, 3000);
    } catch {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-main py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-goto-green"
          >
            <ArrowLeft size={14} />
            Beranda
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-extrabold text-txt-primary sm:text-3xl">
            <Bookmark size={28} className="text-goto-green" />
            Bookmark Saya
          </h1>
          <p className="mt-1 text-sm text-txt-secondary">
            Artikel yang Anda simpan untuk dibaca nanti
          </p>

          {/* Download all for offline */}
          {articles.length > 0 && offlineSlugs.size < articles.length && (
            <button
              onClick={downloadAllForOffline}
              disabled={downloading}
              className="btn-secondary mt-3 inline-flex items-center gap-2 text-xs disabled:opacity-50"
            >
              <Download size={14} />
              {downloading
                ? "Mengunduh..."
                : `Unduh ${articles.length - offlineSlugs.size} artikel untuk offline`}
            </button>
          )}
          {articles.length > 0 && offlineSlugs.size === articles.length && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-goto-green">
              <WifiOff size={14} />
              Semua bookmark tersedia offline
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[12px] border border-border bg-surface-secondary p-4"
              >
                <div className="aspect-[16/9] rounded-lg bg-surface-tertiary" />
                <div className="mt-3 h-5 w-3/4 rounded bg-surface-tertiary" />
                <div className="mt-2 h-4 w-full rounded bg-surface-secondary" />
              </div>
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-surface-secondary p-12 text-center">
            <Bookmark size={48} className="mx-auto mb-4 text-txt-muted" />
            <p className="text-lg font-semibold text-txt-primary">
              Belum ada bookmark
            </p>
            <p className="mt-1 text-sm text-txt-secondary">
              Simpan artikel favorit dengan menekan ikon bookmark pada halaman
              berita.
            </p>
            <Link
              href="/"
              className="btn-primary mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold"
            >
              Jelajahi Berita
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div
                key={article.slug}
                className="group relative rounded-[12px] border border-border bg-surface overflow-hidden shadow-card transition-all hover:shadow-lg"
              >
                {/* Offline badge */}
                {offlineSlugs.has(article.slug) && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-goto-green/90 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                    <WifiOff size={10} />
                    Offline
                  </div>
                )}

                {/* Featured image */}
                {article.featuredImage ? (
                  <Link href={`/berita/${article.slug}`}>
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={article.featuredImage}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  </Link>
                ) : (
                  <Link href={`/berita/${article.slug}`}>
                    <div className="flex aspect-[16/9] items-center justify-center bg-surface-secondary">
                      <Bookmark size={32} className="text-txt-muted" />
                    </div>
                  </Link>
                )}

                <div className="p-4">
                  {/* Category */}
                  {article.category && (
                    <Link
                      href={`/kategori/${article.category.slug}`}
                      className="text-xs font-bold uppercase tracking-wide text-goto-green hover:underline"
                    >
                      {article.category.name}
                    </Link>
                  )}

                  {/* Title */}
                  <Link href={`/berita/${article.slug}`}>
                    <h2 className="mt-1 text-base font-bold leading-snug text-txt-primary line-clamp-2 hover:text-goto-green transition-colors">
                      {article.title}
                    </h2>
                  </Link>

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className="mt-1 text-xs text-txt-secondary line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}

                  {/* Meta + remove */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-txt-muted">
                      {article.author?.name}
                      {article.publishedAt && (
                        <span className="ml-2">
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeBookmark(article.slug)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Hapus bookmark"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

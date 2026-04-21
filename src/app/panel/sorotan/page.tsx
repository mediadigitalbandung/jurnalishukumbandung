"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import Image from "next/image";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  Sparkles, Loader2, CheckCircle, Clock, Scale, AlertTriangle,
  BookOpen, FileText, Gavel, Users, MessageSquare, HelpCircle,
  GitCompareArrows, Play, Eye, RefreshCw, Search,
  ExternalLink, ArrowLeft, ImageIcon, ChevronLeft, ChevronRight,
} from "lucide-react";

const ANGLE_ICONS: Record<string, typeof BookOpen> = {
  kronologi: Clock, analisis: Scale, dampak: AlertTriangle,
  "latar-belakang": BookOpen, "fakta-data": FileText, regulasi: Gavel,
  profil: Users, opini: MessageSquare, perbandingan: GitCompareArrows,
  "tanya-jawab": HelpCircle,
};

interface AngleItem {
  index: number;
  angle: string;
  label: string;
  generated: boolean;
  sorotan: { id: string; slug: string; title: string; content: string; createdAt: string } | null;
}

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string;
  category: { name: string };
  _count?: { sorotan: number };
  sorotanCount?: number;
}

export default function SorotanPanel() {
  const { success, error: showError } = useToast();

  // Article list state
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "partial" | "none">("all");

  // Selected article state
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [angles, setAngles] = useState<AngleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);

  // Load articles with sorotan count
  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch("/api/articles?status=PUBLISHED&limit=200&sort=createdAt");
      const json = await res.json();
      const list = json.data?.articles || json.data || [];

      // Get sorotan counts — skip if too many (just show 0, load on click)
      let counts: Record<string, number> = {};
      try {
        const ids = list.map((a: any) => a.id);
        if (ids.length <= 50) {
          const countsRes = await fetch("/api/seo/generate-sorotan-single?counts=true&articleIds=" + ids.join(","));
          const countsJson = await countsRes.json();
          counts = countsJson.success ? (countsJson.data?.counts || {}) : {};
        } else {
          // Batch in chunks of 50
          for (let i = 0; i < ids.length; i += 50) {
            const chunk = ids.slice(i, i + 50);
            const countsRes = await fetch("/api/seo/generate-sorotan-single?counts=true&articleIds=" + chunk.join(","));
            const countsJson = await countsRes.json().catch(() => ({ success: false }));
            if (countsJson.success) Object.assign(counts, countsJson.data?.counts || {});
          }
        }
      } catch { /* ignore — show 0 */ }

      setArticles(list.map((a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        featuredImage: a.featuredImage,
        publishedAt: a.publishedAt,
        category: a.category || { name: "-" },
        sorotanCount: counts[a.id] || 0,
      })));
    } catch { /* ignore */ }
    setLoadingArticles(false);
  }, []);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  // Load angles for selected article
  const loadAngles = async (articleId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/generate-sorotan-single?articleId=${articleId}`);
      const json = await res.json();
      if (json.success) setAngles(json.data.angles || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const selectArticle = (article: ArticleItem) => {
    setSelectedArticle(article);
    setPreviewAngle(null);
    loadAngles(article.id);
  };

  // Generate single sorotan
  const generateSingle = async (angleIndex: number) => {
    if (!selectedArticle) return;
    setGenerating(angleIndex);
    try {
      const res = await fetch("/api/seo/generate-sorotan-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: selectedArticle.id, angleIndex }),
      });
      const json = await res.json();
      if (json.success) {
        success(`${json.data.sorotan.angleLabel} berhasil di-generate!`);
        loadAngles(selectedArticle.id);
      } else {
        showError(json.error || "Gagal generate");
      }
    } catch {
      showError("Gagal generate sorotan");
    }
    setGenerating(null);
  };

  // Generate all remaining
  const generateAllRemaining = async () => {
    const remaining = angles.filter((a) => !a.generated);
    for (const angle of remaining) {
      await generateSingle(angle.index);
      await new Promise((r) => setTimeout(r, 1500));
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const generatedCount = angles.filter((a) => a.generated).length;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 15;

  // Bulk generate all articles
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentArticle: "", currentAngle: "", done: 0, failed: 0 });
  const [bulkStopped, setBulkStopped] = useState(false);
  const bulkStopRef = useRef(false);

  // Filter articles
  const filteredArticles = articles.filter((a) => {
    if (searchQuery && !a.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "complete" && a.sorotanCount !== 10) return false;
    if (filterStatus === "partial" && (a.sorotanCount === 0 || a.sorotanCount === 10)) return false;
    if (filterStatus === "none" && a.sorotanCount !== 0) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredArticles.length / PER_PAGE);
  const paginatedArticles = filteredArticles.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const statusBadge = (count: number) => {
    if (count === 10) return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-600"><CheckCircle size={10} /> 10/10</span>;
    if (count > 0) return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-600"><Clock size={10} /> {count}/10</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-txt-muted">0/10</span>;
  };

  // === DETAIL VIEW (article selected) ===
  if (selectedArticle) {
    return (
      <div className="space-y-6">
        {/* Back + Article Info */}
        <button onClick={() => { setSelectedArticle(null); loadArticles(); }} className="inline-flex items-center gap-1 text-sm text-goto-green hover:underline">
          <ArrowLeft size={14} /> Kembali ke daftar artikel
        </button>

        {/* Article Preview Card */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="flex gap-5">
            {selectedArticle.featuredImage ? (
              <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-lg">
                <Image src={selectedArticle.featuredImage} alt={selectedArticle.title} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-28 w-44 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary">
                <ImageIcon size={32} className="text-txt-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-goto-green">{selectedArticle.category.name}</p>
              <h2 className="mt-1 text-lg font-bold text-txt-primary leading-tight">{selectedArticle.title}</h2>
              {selectedArticle.excerpt && (
                <p className="mt-2 text-sm text-txt-secondary line-clamp-2">{selectedArticle.excerpt}</p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-txt-muted">{formatDate(selectedArticle.publishedAt)}</span>
                <a href={`/berita/${selectedArticle.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-goto-green hover:underline">
                  <ExternalLink size={10} /> Baca artikel asli
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Progress + Generate All */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-txt-secondary">
              <span className="text-xl font-bold text-goto-green">{generatedCount}</span> / {angles.length} sorotan
            </span>
            <div className="h-2.5 w-48 rounded-full bg-surface-tertiary overflow-hidden">
              <div className="h-full rounded-full bg-goto-green transition-all" style={{ width: `${(generatedCount / Math.max(angles.length, 1)) * 100}%` }} />
            </div>
          </div>
          {generatedCount < angles.length && (
            <button onClick={generateAllRemaining} disabled={generating !== null} className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {generating !== null ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Generate Semua Sisa ({angles.length - generatedCount})
            </button>
          )}
        </div>

        {/* Angles */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-goto-green" /></div>
        ) : (
          <div className="space-y-3">
            {angles.map((a) => {
              const Icon = ANGLE_ICONS[a.angle] || FileText;
              const isGenerating = generating === a.index;
              const isPreview = previewAngle === a.index;
              return (
                <div key={a.angle} className="rounded-[12px] border border-border bg-surface shadow-card overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.generated ? "bg-green-50" : "bg-surface-tertiary"}`}>
                      <Icon size={18} className={a.generated ? "text-green-600" : "text-txt-muted"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-txt-primary">{a.label}</p>
                      <p className="text-xs text-txt-muted">
                        {a.generated ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Sudah di-generate</span> : "Belum di-generate"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.generated ? (
                        <>
                          <button onClick={() => setPreviewAngle(isPreview ? null : a.index)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-txt-secondary hover:bg-surface-secondary">
                            <Eye size={12} /> {isPreview ? "Tutup" : "Preview"}
                          </button>
                          <button onClick={() => generateSingle(a.index)} disabled={isGenerating} className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-generate
                          </button>
                          <a href={`/sorotan/${a.sorotan?.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-goto-green px-3 py-1.5 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white transition-colors">
                            <ExternalLink size={10} /> Lihat
                          </a>
                        </>
                      ) : (
                        <button onClick={() => generateSingle(a.index)} disabled={isGenerating} className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isGenerating ? "Generating..." : "Generate"}
                        </button>
                      )}
                    </div>
                  </div>
                  {isPreview && a.sorotan && (
                    <div className="border-t border-border bg-surface-secondary px-6 py-5">
                      <h3 className="text-base font-bold text-txt-primary mb-3">{a.sorotan.title}</h3>
                      <div className="article-content text-sm leading-relaxed text-txt-primary/80 max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.sorotan.content.replace(/<(p|h[1-6]|ul|ol|li)[^>]*>/gi, (m) => m).split(/\n\n+/).filter(Boolean).map(p => p.trim().startsWith("<") ? p : `<p>${p}</p>`).join("")) }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const generateAllArticles = async () => {
    const incomplete = articles.filter((a) => (a.sorotanCount || 0) < 10);
    if (incomplete.length === 0) { success("Semua artikel sudah lengkap sorotannya!"); return; }

    setBulkGenerating(true);
    setBulkStopped(false);
    bulkStopRef.current = false;
    const totalAngles = incomplete.reduce((sum, a) => sum + (10 - (a.sorotanCount || 0)), 0);
    setBulkProgress({ current: 0, total: totalAngles, currentArticle: "", currentAngle: "", done: 0, failed: 0 });

    let done = 0, failed = 0, current = 0;

    for (const article of incomplete) {
      if (bulkStopRef.current) break;

      // Get which angles are missing for this article
      try {
        const res = await fetch(`/api/seo/generate-sorotan-single?articleId=${article.id}`);
        const json = await res.json();
        if (!json.success) continue;

        const missingAngles = (json.data.angles || []).filter((a: AngleItem) => !a.generated);

        for (const angle of missingAngles) {
          if (bulkStopRef.current) break;

          current++;
          setBulkProgress({ current, total: totalAngles, currentArticle: article.title, currentAngle: angle.label, done, failed });

          try {
            const genRes = await fetch("/api/seo/generate-sorotan-single", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ articleId: article.id, angleIndex: angle.index }),
            });
            const genJson = await genRes.json();
            if (genJson.success) done++;
            else failed++;
          } catch {
            failed++;
          }

          setBulkProgress({ current, total: totalAngles, currentArticle: article.title, currentAngle: angle.label, done, failed });
          await new Promise((r) => setTimeout(r, 2000)); // 2s delay between each
        }
      } catch {
        failed++;
      }
    }

    setBulkGenerating(false);
    loadArticles();
    success(`Selesai! ${done} sorotan berhasil, ${failed} gagal`);
  };

  const stopBulk = () => {
    bulkStopRef.current = true;
    setBulkStopped(true);
  };

  // === LIST VIEW (no article selected) ===
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Sparkles size={28} className="text-blue-600" /> Sorotan SEO
          </h1>
          <p className="text-sm text-txt-secondary mt-1">Pilih artikel atau generate semua sekaligus</p>
        </div>
        {!bulkGenerating ? (
          <button
            onClick={generateAllArticles}
            disabled={articles.filter((a) => (a.sorotanCount || 0) < 10).length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Play size={16} />
            Generate Semua Artikel ({articles.filter((a) => (a.sorotanCount || 0) < 10).length} artikel)
          </button>
        ) : (
          <button onClick={stopBulk} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">
            Stop
          </button>
        )}
      </div>

      {/* Bulk Progress */}
      {bulkGenerating && (
        <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-800">
              <Loader2 size={14} className="inline animate-spin mr-1" />
              Generating sorotan... {bulkProgress.current}/{bulkProgress.total}
            </p>
            <span className="text-xs text-blue-600">{bulkProgress.done} berhasil · {bulkProgress.failed} gagal</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-blue-100 overflow-hidden mb-2">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(bulkProgress.current / Math.max(bulkProgress.total, 1)) * 100}%` }} />
          </div>
          <p className="text-xs text-blue-700 truncate">Artikel: {bulkProgress.currentArticle}</p>
          <p className="text-xs text-blue-600">Angle: {bulkProgress.currentAngle}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-green-600">{articles.filter((a) => a.sorotanCount === 10).length}</p>
          <p className="text-xs text-txt-muted">Lengkap (10/10)</p>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-yellow-600">{articles.filter((a) => (a.sorotanCount || 0) > 0 && (a.sorotanCount || 0) < 10).length}</p>
          <p className="text-xs text-txt-muted">Sebagian</p>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card text-center">
          <p className="text-2xl font-bold text-txt-muted">{articles.filter((a) => !a.sorotanCount).length}</p>
          <p className="text-xs text-txt-muted">Belum Ada</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "none", "partial", "complete"] as const).map((f) => (
            <button key={f} onClick={() => { setFilterStatus(f); setCurrentPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === f ? "bg-goto-green text-white" : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"}`}>
              {f === "all" ? "Semua" : f === "complete" ? "Lengkap" : f === "partial" ? "Sebagian" : "Belum"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Cari artikel..." className="input pl-9 pr-3 py-1.5 text-sm w-60" />
        </div>
      </div>

      {/* Article Table */}
      <div className="overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
        {loadingArticles ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-goto-green" /></div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-12 text-center text-sm text-txt-muted">Tidak ada artikel ditemukan</div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedArticles.map((a) => (
              <button key={a.id} onClick={() => selectArticle(a)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-surface-secondary/50 transition-colors">
                {a.featuredImage ? (
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg">
                    <Image src={a.featuredImage} alt="" fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary">
                    <ImageIcon size={20} className="text-txt-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">{a.title}</p>
                  <p className="text-xs text-txt-muted mt-0.5">{a.category.name} · {formatDate(a.publishedAt)}</p>
                </div>
                <div className="shrink-0">
                  {statusBadge(a.sorotanCount || 0)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-txt-muted">
              {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filteredArticles.length)} dari {filteredArticles.length} artikel
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-txt-muted">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        currentPage === p ? "bg-goto-green text-white" : "text-txt-secondary hover:bg-surface-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

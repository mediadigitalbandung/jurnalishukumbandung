"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Hash, Sparkles, Search, Loader2, CheckCircle, Tag, Trash2, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  category: { name: string };
  tags: { id: string; name: string }[];
  _count: { tags: number };
}

interface TagRow {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
}

interface Stats {
  totalTags: number;
  noTags: number;
  fewTags: number;
  goodTags: number;
  totalArticles: number;
}

const PER_PAGE = 15;
const TAGS_PER_PAGE = 30;

export default function TagsManagerPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role || "";
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<"articles" | "tags">("articles");

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Articles tab
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [artLoading, setArtLoading] = useState(true);
  const [artSearch, setArtSearch] = useState("");
  const [artFilter, setArtFilter] = useState<"all" | "none" | "few">("none");
  const [artPage, setArtPage] = useState(1);
  const [artTotalPages, setArtTotalPages] = useState(1);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  // Tags tab
  const [tags, setTags] = useState<TagRow[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagPage, setTagPage] = useState(1);
  const [tagTotalPages, setTagTotalPages] = useState(1);
  const [tagTotal, setTagTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingTagId, setGeneratingTagId] = useState<string | null>(null);

  if (sessionStatus !== "loading" && session && !["SUPER_ADMIN", "EDITOR"].includes(userRole)) {
    redirect("/panel/dashboard");
  }

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/tags/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Fetch articles ──
  const fetchArticles = useCallback(async () => {
    setArtLoading(true);
    try {
      const params = new URLSearchParams({
        page: artPage.toString(),
        limit: PER_PAGE.toString(),
        filter: artFilter,
      });
      if (artSearch) params.set("q", artSearch);
      const res = await fetch(`/api/tags/articles?${params}`);
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data.articles || []);
        setArtTotalPages(json.data.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ } finally {
      setArtLoading(false);
    }
  }, [artPage, artFilter, artSearch]);

  // ── Fetch tags list ──
  const fetchTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const params = new URLSearchParams({
        page: tagPage.toString(),
        limit: TAGS_PER_PAGE.toString(),
      });
      if (tagSearch) params.set("q", tagSearch);
      const res = await fetch(`/api/tags?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTags(json.data.tags || []);
        setTagTotalPages(json.data.pagination?.totalPages || 1);
        setTagTotal(json.data.pagination?.total || 0);
      }
    } catch { /* ignore */ } finally {
      setTagsLoading(false);
    }
  }, [tagPage, tagSearch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => {
    if (activeTab === "tags") fetchTags();
  }, [activeTab, fetchTags]);

  // Reset tagPage ke 1 saat search berubah
  useEffect(() => { setTagPage(1); }, [tagSearch]);

  // ── Generate tags for single article ──
  async function handleGenerate(articleId: string) {
    setGeneratingId(articleId);
    try {
      const res = await fetch("/api/ai/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal generate");
      const added = json.data.totalTagsAdded ?? 0;
      success(`+${added} tags ditambahkan`);
      setDoneIds((prev) => new Set(prev).add(articleId));
      fetchArticles();
      fetchStats();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal generate tags");
    } finally {
      setGeneratingId(null);
    }
  }

  // ── Bulk generate all articles with < 5 tags ──
  async function handleBulkGenerate() {
    setGeneratingBulk(true);
    try {
      const res = await fetch("/api/ai/bulk-tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal bulk generate");
      success(`Selesai! ${json.data.processed} artikel diproses, ${json.data.totalTagsAdded} tags ditambahkan`);
      fetchArticles();
      fetchStats();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal bulk generate");
    } finally {
      setGeneratingBulk(false);
    }
  }

  // ── Generate auto-article from tag ──
  async function handleGenerateFromTag(tagId: string, tagName: string) {
    setGeneratingTagId(tagId);
    try {
      const res = await fetch("/api/cron/auto-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1, tagId, tagName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal generate artikel");
      if (json.data?.generated > 0) {
        success(`Artikel dari tag "${tagName}" berhasil digenerate sebagai DRAFT`);
      } else {
        const firstError = json.data?.results?.[0]?.error || "Tidak ada artikel sumber dengan tag ini";
        showError(firstError);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal generate artikel");
    } finally {
      setGeneratingTagId(null);
    }
  }

  // ── Delete tag ──
  async function handleDeleteTag(id: string, name: string) {
    if (!confirm(`Hapus tag "${name}"? Tag akan dilepas dari semua artikel.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tags?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal hapus tag");
      }
      success(`Tag "${name}" dihapus`);
      fetchTags();
      fetchStats();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal hapus tag");
    } finally {
      setDeletingId(null);
    }
  }


  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-txt-primary flex items-center gap-2">
          <Hash size={26} className="text-goto-green" />
          Tags Manager
        </h1>
        <p className="text-base text-txt-secondary mt-1">Kelola dan generate tags SEO untuk semua artikel</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
            <p className="text-sm text-txt-secondary mb-1">Total Tags</p>
            <p className="text-3xl font-bold text-goto-green">{stats.totalTags.toLocaleString("id-ID")}</p>
          </div>
          <div className="rounded-[12px] border border-red-200 bg-red-50 p-5 shadow-card">
            <p className="text-sm text-red-600 mb-1">Tanpa Tags</p>
            <p className="text-3xl font-bold text-red-600">{stats.noTags.toLocaleString("id-ID")}</p>
            <p className="text-xs text-red-400 mt-1">artikel</p>
          </div>
          <div className="rounded-[12px] border border-yellow-200 bg-yellow-50 p-5 shadow-card">
            <p className="text-sm text-yellow-700 mb-1">Tags Kurang</p>
            <p className="text-3xl font-bold text-yellow-700">{stats.fewTags.toLocaleString("id-ID")}</p>
            <p className="text-xs text-yellow-500 mt-1">1–4 tags</p>
          </div>
          <div className="rounded-[12px] border border-green-200 bg-green-50 p-5 shadow-card">
            <p className="text-sm text-green-700 mb-1">Tags Cukup</p>
            <p className="text-3xl font-bold text-green-700">{stats.goodTags.toLocaleString("id-ID")}</p>
            <p className="text-xs text-green-500 mt-1">5+ tags</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["articles", "tags"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-goto-green text-goto-green"
                : "border-transparent text-txt-secondary hover:text-txt-primary"
            }`}
          >
            {tab === "articles" ? "Artikel" : "Semua Tags"}
          </button>
        ))}
      </div>

      {/* ── ARTICLES TAB ── */}
      {activeTab === "articles" && (
        <div>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                type="text"
                placeholder="Cari judul artikel..."
                value={artSearch}
                onChange={(e) => { setArtSearch(e.target.value); setArtPage(1); }}
                className="input pl-9 w-full text-base"
              />
            </div>
            <select
              value={artFilter}
              onChange={(e) => { setArtFilter(e.target.value as typeof artFilter); setArtPage(1); }}
              className="input w-full sm:w-48 text-base"
            >
              <option value="none">Prioritas: Kurang Tags</option>
              <option value="all">Semua Artikel</option>
              <option value="few">1–4 Tags</option>
            </select>
            <button
              onClick={handleBulkGenerate}
              disabled={generatingBulk}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap"
            >
              {generatingBulk ? (
                <><Loader2 size={16} className="animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={16} /> Generate Semua</>
              )}
            </button>
            <button onClick={fetchArticles} className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {/* Bulk generate info */}
          <div className="mb-4 rounded-[12px] border border-border bg-surface-secondary p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-goto-green mt-0.5 shrink-0" />
            <p className="text-sm text-txt-secondary">
              <strong className="text-txt-primary">Generate Semua</strong> — otomatis generate tags untuk semua artikel yang punya kurang dari 5 tags. Proses bisa memakan waktu beberapa menit tergantung jumlah artikel.
            </p>
          </div>

          {/* Articles table */}
          {artLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
            </div>
          ) : articles.length === 0 ? (
            <div className="rounded-[12px] border-2 border-dashed border-border py-16 text-center">
              <Tag size={32} className="mx-auto mb-3 text-txt-muted" />
              <p className="text-txt-muted">Tidak ada artikel ditemukan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className={`rounded-[12px] border bg-surface p-5 shadow-card transition-colors ${
                    doneIds.has(article.id) ? "border-green-300 bg-green-50" : "border-border"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-goto-green bg-goto-light px-2 py-0.5 rounded-full">
                          {article.category.name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          article._count.tags === 0
                            ? "bg-red-100 text-red-600"
                            : article._count.tags < 5
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {article._count.tags} tags
                        </span>
                        {doneIds.has(article.id) && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> Selesai
                          </span>
                        )}
                      </div>
                      <p className="text-base font-semibold text-txt-primary leading-snug mb-2 line-clamp-2">
                        {article.title}
                      </p>
                      {/* Current tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {article.tags.length === 0 ? (
                          <span className="text-sm text-txt-muted italic">Belum ada tags</span>
                        ) : (
                          article.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="text-xs bg-surface-secondary border border-border text-txt-secondary px-2 py-0.5 rounded-full"
                            >
                              #{tag.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerate(article.id)}
                      disabled={generatingId === article.id || generatingBulk}
                      className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap shrink-0"
                    >
                      {generatingId === article.id ? (
                        <><Loader2 size={14} className="animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles size={14} /> Generate Tags</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {artTotalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-txt-secondary">
                Halaman {artPage} dari {artTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setArtPage((p) => Math.max(1, p - 1))}
                  disabled={artPage === 1}
                  className="btn-secondary flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </button>
                <button
                  onClick={() => setArtPage((p) => Math.min(artTotalPages, p + 1))}
                  disabled={artPage === artTotalPages}
                  className="btn-primary flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                >
                  Selanjutnya <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAGS TAB ── */}
      {activeTab === "tags" && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                type="text"
                placeholder="Cari nama tag..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="input pl-9 w-full text-base"
              />
            </div>
            <button onClick={() => { setTagPage(1); fetchTags(); }} className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
          {tagTotal > 0 && (
            <p className="text-sm text-txt-muted mb-4">
              {tagTotal.toLocaleString("id-ID")} tag ditemukan · halaman {tagPage} dari {tagTotalPages}
            </p>
          )}

          {tagsLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="rounded-[12px] border border-border bg-surface p-4 shadow-card flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-base font-semibold text-txt-primary flex items-center gap-1.5">
                      <Hash size={14} className="text-goto-green" />
                      {tag.name}
                    </p>
                    <p className="text-sm text-txt-muted mt-0.5">
                      {tag._count.articles} artikel
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleGenerateFromTag(tag.id, tag.name)}
                      disabled={generatingTagId === tag.id || deletingId === tag.id}
                      className="p-2 rounded-lg text-txt-muted hover:text-goto-green hover:bg-goto-light transition-colors disabled:opacity-40"
                      title="Generate artikel dari tag ini"
                    >
                      {generatingTagId === tag.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      disabled={deletingId === tag.id || generatingTagId === tag.id}
                      className="p-2 rounded-lg text-txt-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Hapus tag"
                    >
                      {deletingId === tag.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              {tags.length === 0 && (
                <div className="col-span-full rounded-[12px] border-2 border-dashed border-border py-16 text-center">
                  <Hash size={32} className="mx-auto mb-3 text-txt-muted" />
                  <p className="text-txt-muted">Tidak ada tag ditemukan</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {tagTotalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-txt-secondary">
                Halaman {tagPage} dari {tagTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTagPage(1)}
                  disabled={tagPage === 1}
                  className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
                >
                  «
                </button>
                <button
                  onClick={() => setTagPage((p) => Math.max(1, p - 1))}
                  disabled={tagPage === 1}
                  className="btn-secondary flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, tagTotalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(tagPage - 2, tagTotalPages - 4));
                    const p = start + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setTagPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          p === tagPage
                            ? "bg-goto-green text-white"
                            : "btn-secondary"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setTagPage((p) => Math.min(tagTotalPages, p + 1))}
                  disabled={tagPage === tagTotalPages}
                  className="btn-primary flex items-center gap-1 px-3 py-2 text-sm disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setTagPage(tagTotalPages)}
                  disabled={tagPage === tagTotalPages}
                  className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

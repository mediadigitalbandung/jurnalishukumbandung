"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, FileText, Calendar, Loader2, Sparkles, Check, LayoutTemplate } from "lucide-react";

interface ArticleResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  category?: { name: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (article: ArticleResult, opts: SelectOptions) => Promise<void>;
}

export interface SelectOptions {
  fillTitle: boolean;
  fillCaption: boolean;
  fillHashtags: boolean;
  createFeaturedClip: boolean;
  generateTextOverlays: boolean;
  templateId?: string | null;
  applyTemplateSlots?: boolean;
}

interface TemplateOption {
  id: string;
  name: string;
  frameStyle: string;
  overlays: { id: string }[];
  slots?: { id: string; type: string }[];
}

export default function ArticlePicker({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [recentArticles, setRecentArticles] = useState<ArticleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Generation options
  const [opts, setOpts] = useState<SelectOptions>({
    fillTitle: true,
    fillCaption: true,
    fillHashtags: true,
    createFeaturedClip: true,
    generateTextOverlays: true,
    templateId: null,
    applyTemplateSlots: false,
  });

  // Templates available
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  useEffect(() => {
    if (!open) return;
    fetch("/api/tiktok/templates")
      .then((r) => r.json())
      .then((j) => { if (j.success) setTemplates(j.data || []); })
      .catch(() => { /* ignore */ });
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=15`);
      const json = await res.json();
      if (json.success) setResults(json.data?.articles || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/articles?status=PUBLISHED&limit=15&sort=publishedAt");
      const json = await res.json();
      if (json.success) {
        const list = json.data?.articles || json.data || [];
        setRecentArticles(list);
      }
    } catch { /* ignore */ }
    setLoadingRecent(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, open, doSearch]);

  // Reset on open + load recent articles
  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setSearch("");
      setResults([]);
      loadRecent();
    }
  }, [open, loadRecent]);

  // Show search results if user typing, else show recent
  const showingSearch = search.trim().length >= 2;
  const displayList = showingSearch ? results : recentArticles;

  if (!open) return null;

  const selectedArticle = displayList.find((a) => a.id === selectedId) || null;

  const handleApply = async () => {
    if (!selectedArticle) return;
    setApplying(true);
    try {
      await onSelect(selectedArticle, opts);
      onClose();
    } catch {
      // Error handled by parent
    }
    setApplying(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-pink-50 px-5 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-pink-700">
              <FileText size={18} /> Pilih Artikel Terkait
            </h3>
            <p className="mt-0.5 text-xs text-pink-600">
              Auto-generate caption, hashtag, foto + text dari artikel JHB
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-pink-700 hover:bg-pink-100">
            <X size={18} />
          </button>
        </div>

        {/* Search input */}
        <div className="border-b border-border px-5 py-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul artikel... (min 2 huruf)"
              className="input w-full pl-9 text-sm"
              autoFocus
            />
            {loading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-pink-600" />
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {/* Section header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-secondary/95 px-5 py-2 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-wider text-txt-muted">
              {showingSearch ? (
                <>🔍 Hasil Pencarian &ldquo;{search}&rdquo; ({results.length})</>
              ) : (
                <>📰 Artikel Terbaru ({recentArticles.length})</>
              )}
            </p>
            {loadingRecent && !showingSearch && (
              <Loader2 size={11} className="animate-spin text-pink-500" />
            )}
          </div>

          {/* Empty states */}
          {showingSearch && results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-txt-muted">
              <FileText size={32} />
              <p className="text-sm">Tidak ada hasil untuk &ldquo;{search}&rdquo;</p>
              <button
                onClick={() => setSearch("")}
                className="text-xs text-pink-600 hover:underline"
              >
                Lihat artikel terbaru
              </button>
            </div>
          )}
          {!showingSearch && recentArticles.length === 0 && !loadingRecent && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-txt-muted">
              <FileText size={32} />
              <p className="text-sm">Belum ada artikel published</p>
            </div>
          )}

          <div className="divide-y divide-border">
            {displayList.map((article) => {
              const isSelected = article.id === selectedId;
              return (
                <button
                  key={article.id}
                  onClick={() => setSelectedId(article.id)}
                  className={`flex w-full items-start gap-3 px-5 py-3 text-left transition-colors ${
                    isSelected ? "bg-pink-50 ring-2 ring-inset ring-pink-300" : "hover:bg-surface-secondary"
                  }`}
                >
                  {article.featuredImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.featuredImage}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-txt-primary line-clamp-2">{article.title}</p>
                    {article.excerpt && (
                      <p className="mt-1 text-xs text-txt-secondary line-clamp-2">{article.excerpt}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-txt-muted">
                      {article.category && (
                        <span className="rounded-full bg-goto-light px-2 py-0.5 text-goto-green">
                          {article.category.name}
                        </span>
                      )}
                      {article.publishedAt && (
                        <span className="flex items-center gap-0.5">
                          <Calendar size={9} />
                          {new Date(article.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={18} className="shrink-0 text-pink-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generation options */}
        {selectedArticle && (
          <div className="border-t border-border bg-surface-secondary/40 px-5 py-3">
            {/* Template selector */}
            {templates.length > 0 && (
              <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2">
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  <LayoutTemplate size={11} /> Pakai Template (opsional)
                </label>
                <select
                  value={opts.templateId || ""}
                  onChange={(e) => setOpts({ ...opts, templateId: e.target.value || null, applyTemplateSlots: false })}
                  className="input w-full text-xs"
                >
                  <option value="">— Tanpa template (default) —</option>
                  {templates.map((t) => {
                    const slotCount = t.slots?.length || 0;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {slotCount > 0 ? ` 📋${slotCount}slot` : ""}
                        {t.overlays.length > 0 ? ` 🖼${t.overlays.length}` : ""}
                        {t.frameStyle !== "none" ? ` 🎞${t.frameStyle}` : ""}
                      </option>
                    );
                  })}
                </select>
                {/* Apply slot structure toggle — visible only if template has slots */}
                {opts.templateId && (templates.find((t) => t.id === opts.templateId)?.slots?.length || 0) > 0 && (
                  <label className="mt-2 flex cursor-pointer items-start gap-2 rounded border border-amber-300 bg-amber-50 p-1.5">
                    <input
                      type="checkbox"
                      checked={!!opts.applyTemplateSlots}
                      onChange={(e) => setOpts({ ...opts, applyTemplateSlots: e.target.checked })}
                      className="mt-0.5 accent-amber-600"
                    />
                    <div className="flex-1 text-[10px]">
                      <p className="font-semibold text-amber-800">Apply Slot Structure</p>
                      <p className="text-amber-700">
                        ⚠️ HAPUS clip existing, bikin slot kosong sesuai template (foto/video/dst). Featured image artikel auto-isi slot foto pertama.
                      </p>
                    </div>
                  </label>
                )}
                <p className="mt-1 text-[10px] text-indigo-600">
                  Template = frame, PNG overlay, subtitle style, backsong. {opts.applyTemplateSlots ? "+ struktur slot." : "Foto/video tetap dari artikel."}
                </p>
              </div>
            )}

            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-txt-muted">
              <Sparkles size={12} /> Auto-Generate
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Toggle
                label="Title"
                checked={opts.fillTitle}
                onChange={(v) => setOpts({ ...opts, fillTitle: v })}
                hint="Set judul TikTok dari judul artikel"
              />
              <Toggle
                label="Caption"
                checked={opts.fillCaption}
                onChange={(v) => setOpts({ ...opts, fillCaption: v })}
                hint="Excerpt + hashtag jadi caption post"
              />
              <Toggle
                label="Hashtags"
                checked={opts.fillHashtags}
                onChange={(v) => setOpts({ ...opts, fillHashtags: v })}
                hint="Dari tag artikel + brand JHB"
              />
              <Toggle
                label="Foto Featured"
                checked={opts.createFeaturedClip}
                onChange={(v) => setOpts({ ...opts, createFeaturedClip: v })}
                hint="Featured image jadi clip pertama"
              />
              <Toggle
                label="Text Overlay (AI)"
                checked={opts.generateTextOverlays}
                onChange={(v) => setOpts({ ...opts, generateTextOverlays: v })}
                hint="AI ringkas artikel jadi 3-5 caption per clip"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3">
          <button
            onClick={onClose}
            disabled={applying}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedArticle || applying}
            className="flex items-center gap-1.5 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {applying ? "Generating..." : "Pilih & Auto-Fill"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label, checked, onChange, hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded border border-border bg-surface p-2 hover:border-pink-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-pink-600"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-txt-primary">{label}</p>
        <p className="text-[10px] text-txt-muted">{hint}</p>
      </div>
    </label>
  );
}

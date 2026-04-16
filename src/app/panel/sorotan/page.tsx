"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Sparkles, Loader2, CheckCircle, Clock, Scale, AlertTriangle,
  BookOpen, FileText, Gavel, Users, MessageSquare, HelpCircle,
  GitCompareArrows, Play, Eye, Trash2, RefreshCw, ChevronDown,
  ExternalLink,
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

interface ArticleOption {
  id: string;
  title: string;
  slug: string;
}

export default function SorotanPanel() {
  const { success, error: showError } = useToast();

  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [angles, setAngles] = useState<AngleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Load published articles
  useEffect(() => {
    setLoadingArticles(true);
    fetch("/api/articles?status=PUBLISHED&limit=100&sort=createdAt")
      .then((r) => r.json())
      .then((json) => {
        const list = json.data?.articles || json.data || [];
        setArticles(list.map((a: any) => ({ id: a.id, title: a.title, slug: a.slug })));
      })
      .catch(() => {})
      .finally(() => setLoadingArticles(false));
  }, []);

  // Load angles for selected article
  const loadAngles = async (articleId: string) => {
    if (!articleId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/generate-sorotan-single?articleId=${articleId}`);
      const json = await res.json();
      if (json.success) setAngles(json.data.angles || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedArticleId) loadAngles(selectedArticleId);
    else setAngles([]);
  }, [selectedArticleId]);

  // Generate single sorotan
  const generateSingle = async (angleIndex: number) => {
    setGenerating(angleIndex);
    try {
      const res = await fetch("/api/seo/generate-sorotan-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: selectedArticleId, angleIndex }),
      });
      const json = await res.json();
      if (json.success) {
        success(`${json.data.sorotan.angleLabel} berhasil di-generate!`);
        loadAngles(selectedArticleId);
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
      await new Promise((r) => setTimeout(r, 1000)); // Delay between calls
    }
  };

  // Delete single sorotan
  const deleteSorotan = async (sorotanId: string) => {
    try {
      // Use the existing sorotan delete via a simple fetch
      await fetch(`/api/seo/generate-sorotan-single`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: selectedArticleId, angleIndex: -1, deleteId: sorotanId }),
      });
      loadAngles(selectedArticleId);
    } catch { /* ignore */ }
  };

  const generatedCount = angles.filter((a) => a.generated).length;
  const selectedArticle = articles.find((a) => a.id === selectedArticleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
          <Sparkles size={28} className="text-blue-600" />
          Sorotan SEO
        </h1>
        <p className="text-sm text-txt-secondary mt-1">
          Generate halaman sorotan satu per satu — preview sebelum publish
        </p>
      </div>

      {/* Article Selector */}
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <label className="mb-2 block text-sm font-medium text-txt-primary">Pilih Artikel</label>
        {loadingArticles ? (
          <div className="flex items-center gap-2 text-txt-muted"><Loader2 size={16} className="animate-spin" /> Memuat artikel...</div>
        ) : (
          <select
            value={selectedArticleId}
            onChange={(e) => setSelectedArticleId(e.target.value)}
            className="input w-full"
          >
            <option value="">-- Pilih artikel --</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        )}
        {selectedArticle && (
          <a
            href={`/berita/${selectedArticle.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-goto-green hover:underline"
          >
            <ExternalLink size={10} /> Lihat artikel asli
          </a>
        )}
      </div>

      {/* Angles List */}
      {selectedArticleId && (
        <>
          {/* Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm text-txt-secondary">
                <span className="text-lg font-bold text-goto-green">{generatedCount}</span> / {angles.length} sorotan
              </div>
              <div className="h-2 w-40 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full bg-goto-green transition-all"
                  style={{ width: `${(generatedCount / Math.max(angles.length, 1)) * 100}%` }}
                />
              </div>
            </div>
            {generatedCount < angles.length && (
              <button
                onClick={generateAllRemaining}
                disabled={generating !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {generating !== null ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Generate Semua Sisa ({angles.length - generatedCount})
              </button>
            )}
          </div>

          {/* Angle Cards */}
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
                    {/* Row header */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.generated ? "bg-green-50" : "bg-surface-tertiary"}`}>
                        <Icon size={18} className={a.generated ? "text-green-600" : "text-txt-muted"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary">{a.label}</p>
                        <p className="text-xs text-txt-muted">
                          {a.generated ? (
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10} /> Sudah di-generate</span>
                          ) : (
                            "Belum di-generate"
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {a.generated ? (
                          <>
                            <button
                              onClick={() => setPreviewAngle(isPreview ? null : a.index)}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-txt-secondary hover:bg-surface-secondary"
                            >
                              <Eye size={12} /> {isPreview ? "Tutup" : "Preview"}
                            </button>
                            <button
                              onClick={() => generateSingle(a.index)}
                              disabled={isGenerating}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                            >
                              {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              Re-generate
                            </button>
                            <a
                              href={`/sorotan/${a.sorotan?.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-goto-green px-3 py-1.5 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white transition-colors"
                            >
                              <ExternalLink size={10} /> Lihat Halaman
                            </a>
                          </>
                        ) : (
                          <button
                            onClick={() => generateSingle(a.index)}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isGenerating ? "Generating..." : "Generate"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview panel */}
                    {isPreview && a.sorotan && (
                      <div className="border-t border-border bg-surface-secondary px-6 py-5">
                        <h3 className="text-base font-bold text-txt-primary mb-3">{a.sorotan.title}</h3>
                        <div
                          className="article-content text-sm leading-relaxed text-txt-primary/80 max-h-96 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: a.sorotan.content }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

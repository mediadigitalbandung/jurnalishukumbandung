"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  Award,
  RefreshCw,
  Loader2,
  ChevronLeft,
  Download,
  ExternalLink,
  Edit,
} from "lucide-react";

type ScoreArticle = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  publishedAt: string;
  viewCount: number;
  hasImage: boolean;
  targetKeyword: string | null;
  total: number;
  max: number;
  percentage: number;
  breakdown: Record<string, number>;
  issues: string[];
  wordCount: number;
  h2Count: number;
  linkCount: number;
};

type ScoresData = {
  total: number;
  avgScore: number;
  distribution: { excellent: number; good: number; fair: number; poor: number; critical: number };
  articles: ScoreArticle[];
};

const BUCKETS = [
  { key: "all", label: "Semua", min: 0, max: 100, color: "bg-surface-secondary text-txt-secondary border-border" },
  { key: "excellent", label: "🟢 Excellent (90+)", min: 90, max: 100, color: "bg-green-50 text-goto-green border-green-200" },
  { key: "good", label: "🟡 Good (75-89)", min: 75, max: 89, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { key: "fair", label: "🟠 Fair (60-74)", min: 60, max: 74, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { key: "poor", label: "🔴 Poor (40-59)", min: 40, max: 59, color: "bg-red-50 text-red-600 border-red-200" },
  { key: "critical", label: "⚫ Critical (<40)", min: 0, max: 39, color: "bg-gray-100 text-txt-secondary border-border" },
] as const;

function classifyScore(pct: number) {
  if (pct >= 90) return { label: "🟢", color: "text-goto-green" };
  if (pct >= 75) return { label: "🟡", color: "text-yellow-600" };
  if (pct >= 60) return { label: "🟠", color: "text-orange-600" };
  if (pct >= 40) return { label: "🔴", color: "text-red-600" };
  return { label: "⚫", color: "text-txt-muted" };
}

export default function SeoScoresPage() {
  const { error: showError } = useToast();
  const [data, setData] = useState<ScoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score-asc" | "score-desc" | "recent">("score-asc");
  const [visibleCount, setVisibleCount] = useState(50);

  const load = useCallback(async (sortBy: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/scores?sort=${sortBy}&limit=300`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else showError(json.error || "Gagal load");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => { load(sort); }, [sort, load]);

  const articles = data?.articles || [];
  const filtered = articles.filter((a) => {
    const b = BUCKETS.find((b) => b.key === bucket);
    if (b && b.key !== "all") {
      if (a.percentage < b.min || a.percentage > b.max) return false;
    }
    if (search.trim() && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const visible = filtered.slice(0, visibleCount);

  const exportCsv = () => {
    const header = ["Title", "Score (%)", "Category", "Target Keyword", "Word Count", "H2", "Links", "Issues"];
    const rows = filtered.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      a.percentage,
      a.category || "",
      a.targetKeyword || "",
      a.wordCount,
      a.h2Count,
      a.linkCount,
      `"${a.issues.join("; ").replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-scores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-main py-6 space-y-6">
      <div>
        <Link href="/panel/seo" className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-txt-primary mb-3">
          <ChevronLeft size={14} /> Kembali ke SEO Monitor
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
              <Award size={22} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-txt-primary">SEO Scores</h1>
              <p className="text-sm text-txt-secondary">
                Score 10 kriteria untuk artikel published
                {data && ` · ${data.total} artikel · avg ${data.avgScore}%`}
              </p>
            </div>
          </div>
          <button
            onClick={() => load(sort)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Distribution buckets */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {BUCKETS.map((b) => {
          const count = b.key === "all" ? data?.total ?? 0 : data?.distribution?.[b.key as keyof typeof data.distribution] ?? 0;
          const total = data?.total ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={b.key}
              onClick={() => { setBucket(b.key); setVisibleCount(50); }}
              className={`rounded-[12px] border p-4 text-left transition-all ${
                bucket === b.key ? `${b.color} ring-2 ring-offset-1 ring-current` : `border-border bg-surface hover:border-goto-green`
              }`}
            >
              <p className="text-xs font-medium opacity-80">{b.label}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
              <p className="text-xs opacity-60 mt-0.5">{pct}%</p>
            </button>
          );
        })}
      </div>

      {/* Article list */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-txt-primary">
              Artikel Published
              <span className="ml-2 text-sm font-normal text-txt-muted">({filtered.length})</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Cari title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(50); }}
              className="rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs focus:border-goto-green focus:outline-none w-44"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "score-asc" | "score-desc" | "recent")}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs focus:border-goto-green focus:outline-none"
            >
              <option value="score-asc">Score terendah dulu</option>
              <option value="score-desc">Score tertinggi dulu</option>
              <option value="recent">Terbaru</option>
            </select>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-secondary disabled:opacity-50"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-goto-green" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-txt-muted">Tidak ada artikel di filter ini</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {visible.map((a) => {
                const cls = classifyScore(a.percentage);
                return (
                  <div key={a.id} className="grid grid-cols-[80px_1fr_auto] gap-3 py-3 items-center">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${cls.color}`}>{a.percentage}</p>
                      <p className="text-[10px] text-txt-muted uppercase">/{a.max}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate">{a.title}</p>
                      <p className="text-xs text-txt-muted mt-0.5">
                        {a.category || "-"} · {a.wordCount} kata · {a.h2Count} H2 · {a.linkCount} link · {a.viewCount} views
                        {a.targetKeyword && <> · target: <code className="bg-border px-1 rounded text-[10px]">{a.targetKeyword}</code></>}
                      </p>
                      {a.issues.length > 0 && (
                        <p className="text-xs text-red-600 mt-1 truncate" title={a.issues.join(" · ")}>
                          ⚠️ {a.issues.slice(0, 2).join(" · ")}
                          {a.issues.length > 2 && ` (+${a.issues.length - 2} lagi)`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Link
                        href={`/panel/artikel/${a.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-full bg-goto-green px-3 py-1.5 text-xs font-medium text-white hover:bg-goto-dark"
                      >
                        <Edit size={11} /> Edit
                      </Link>
                      <a
                        href={`/berita/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-txt-muted hover:bg-surface-secondary"
                      >
                        <ExternalLink size={10} /> Lihat
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.length > visibleCount && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + 50)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-4 py-2 text-xs font-medium text-txt-secondary hover:bg-border"
                >
                  Muat 50 lagi ({filtered.length - visibleCount} tersisa)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Scoring criteria */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">📊 10 Kriteria Score</h3>
        <ol className="text-xs text-blue-900 space-y-0.5">
          <li>1. Title length 50-70 char (10 pts)</li>
          <li>2. seoTitle ideal 50-60 char (10 pts)</li>
          <li>3. seoDescription 145-160 char (10 pts)</li>
          <li>4. Excerpt present (5 pts)</li>
          <li>5. Keyword di title (10 pts)</li>
          <li>6. Keyword di H2 (10 pts)</li>
          <li>7. Keyword di paragraf 1 (10 pts)</li>
          <li>8. Word count ≥400/500/800 (15 pts)</li>
          <li>9. Internal links ≥2/5 (10 pts)</li>
          <li>10. Tags ≥3/5 (5 pts)</li>
          <li className="font-semibold">Bonus: FAQ section (5 pts)</li>
        </ol>
      </div>
    </div>
  );
}

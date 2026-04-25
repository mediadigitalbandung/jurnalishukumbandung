"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  Search,
  TrendingUp,
  Target,
  AlertTriangle,
  Trophy,
  Telescope,
  RefreshCw,
  Loader2,
  ChevronLeft,
  Download,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react";

type Query = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  expectedCtr?: number;
};

type InsightData = {
  configured: boolean;
  period?: { days: number; startDate: string; endDate: string };
  summary?: {
    total: number;
    top3: number;
    page1: number;
    opportunity: number;
    lowCtr: number;
    page23: number;
    deep: number;
  };
  queries?: {
    top3: Query[];
    page1: Query[];
    opportunity: Query[];
    lowCtr: Query[];
    page23: Query[];
    deep: Query[];
  };
};

const SECTIONS = [
  { key: "opportunity", label: "🎯 Opportunity", color: "bg-orange-50 text-orange-600 border-orange-200", desc: "Posisi #11-30 dengan impresi ≥50 — prioritas optimasi" },
  { key: "lowCtr", label: "⚠️ Low CTR", color: "bg-red-50 text-red-600 border-red-200", desc: "Top 10 dengan CTR rendah — revisi judul/meta" },
  { key: "top3", label: "🏆 Top 3", color: "bg-green-50 text-goto-green border-green-200", desc: "Posisi #1-3 — current wins" },
  { key: "page1", label: "🥇 Page 1", color: "bg-blue-50 text-blue-600 border-blue-200", desc: "Posisi #4-10 — push to top 3" },
  { key: "page23", label: "📍 Page 2-3", color: "bg-yellow-50 text-yellow-700 border-yellow-200", desc: "Semua posisi #11-30" },
  { key: "deep", label: "🔭 Deep", color: "bg-gray-50 text-txt-secondary border-border", desc: "Posisi >30 — riset / drop strategy" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

function fmtPos(n: number) { return "#" + n.toFixed(1); }
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }
function fmtNum(n: number) { return n.toLocaleString("id-ID"); }

function exportCsv(queries: Query[], section: string) {
  const header = ["Keyword", "Clicks", "Impressions", "CTR (%)", "Position"];
  const rows = queries.map(q => [
    `"${q.query.replace(/"/g, '""')}"`,
    q.clicks,
    q.impressions,
    (q.ctr * 100).toFixed(2),
    q.position.toFixed(1),
  ]);
  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gsc-${section}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SeoInsightPage() {
  const { error: showError } = useToast();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(28);
  const [activeSection, setActiveSection] = useState<SectionKey>("opportunity");
  const [search, setSearch] = useState("");

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/insight?days=${d}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else showError(json.error || "Gagal load GSC data");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => { load(days); }, [days, load]);

  const queries = data?.queries?.[activeSection] || [];
  const filtered = search.trim()
    ? queries.filter(q => q.query.toLowerCase().includes(search.toLowerCase()))
    : queries;

  if (data?.configured === false) {
    return (
      <div className="container-main py-6">
        <Link href="/panel/seo" className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-txt-primary mb-4">
          <ChevronLeft size={14} /> Kembali ke SEO Monitor
        </Link>
        <div className="rounded-[12px] border border-dashed border-border bg-surface-secondary p-8 text-center">
          <WifiOff size={40} className="mx-auto text-txt-muted mb-3" />
          <h3 className="text-lg font-semibold text-txt-primary mb-1">Google Search Console Belum Dikonfigurasi</h3>
          <p className="text-sm text-txt-secondary mb-4">
            Setup di <code className="bg-border px-1 rounded text-xs">/panel/pengaturan</code> dengan keys:{" "}
            <code className="text-goto-green">google_service_account</code> +{" "}
            <code className="text-goto-green">search_console_site_url</code>
          </p>
          <Link href="/panel/pengaturan" className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm text-white hover:bg-goto-dark">
            <Settings size={14} /> Buka Pengaturan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-6 space-y-6">
      <div>
        <Link href="/panel/seo" className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-txt-primary mb-3">
          <ChevronLeft size={14} /> Kembali ke SEO Monitor
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
              <Search size={22} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-txt-primary">GSC Insight</h1>
              <p className="text-sm text-txt-secondary">
                Categorized keyword data dari Google Search Console
                {data?.period && ` · ${data.period.startDate} → ${data.period.endDate}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm focus:border-goto-green focus:outline-none"
            >
              <option value={7}>7 hari</option>
              <option value={28}>28 hari</option>
              <option value={90}>90 hari</option>
            </select>
            <button
              onClick={() => load(days)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SECTIONS.map((s) => {
          const count = data?.summary?.[s.key] ?? 0;
          const total = data?.summary?.total ?? 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`rounded-[12px] border p-4 text-left transition-all ${
                activeSection === s.key
                  ? `${s.color} ring-2 ring-offset-1 ring-current`
                  : `border-border bg-surface hover:border-goto-green`
              }`}
            >
              <p className="text-xs font-medium opacity-80">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{count}</p>
              <p className="text-xs opacity-60 mt-0.5">{pct}% dari total</p>
            </button>
          );
        })}
      </div>

      {/* Section description */}
      {data?.queries && (
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-txt-primary">
                {SECTIONS.find(s => s.key === activeSection)?.label}
                <span className="ml-2 text-sm font-normal text-txt-muted">({filtered.length})</span>
              </h2>
              <p className="text-xs text-txt-secondary mt-0.5">
                {SECTIONS.find(s => s.key === activeSection)?.desc}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs focus:border-goto-green focus:outline-none w-44"
              />
              <button
                onClick={() => exportCsv(filtered, activeSection)}
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
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-txt-muted">
                {search ? "Tidak ada keyword cocok dengan pencarian" : "Tidak ada keyword di kategori ini"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-txt-muted border-b border-border">
                  <tr>
                    <th className="text-right pb-2 pr-3 w-12">#</th>
                    <th className="text-left pb-2 pr-3">Keyword</th>
                    <th className="text-right pb-2 pr-3">Posisi</th>
                    <th className="text-right pb-2 pr-3">Impresi</th>
                    <th className="text-right pb-2 pr-3">Klik</th>
                    <th className="text-right pb-2 pr-3">CTR</th>
                    {activeSection === "lowCtr" && <th className="text-right pb-2">CTR Expected</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.slice(0, 100).map((q, i) => (
                    <tr key={`${q.query}-${i}`} className="hover:bg-surface-secondary/50">
                      <td className="py-2 pr-3 text-right text-xs text-txt-muted">{i + 1}</td>
                      <td className="py-2 pr-3 text-txt-primary">{q.query}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${
                        q.position <= 3 ? "text-goto-green" :
                        q.position <= 10 ? "text-blue-600" :
                        q.position <= 20 ? "text-orange-500" :
                        "text-txt-muted"
                      }`}>{fmtPos(q.position)}</td>
                      <td className="py-2 pr-3 text-right text-txt-secondary">{fmtNum(q.impressions)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-txt-primary">{fmtNum(q.clicks)}</td>
                      <td className="py-2 pr-3 text-right text-txt-secondary">{fmtPct(q.ctr)}</td>
                      {activeSection === "lowCtr" && (
                        <td className="py-2 text-right text-red-600 font-medium">{q.expectedCtr?.toFixed(1)}%</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > 100 && (
                <p className="mt-3 text-xs text-txt-muted text-center">
                  Menampilkan 100 dari {filtered.length}. Export CSV untuk full data.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Cara Pakai Setiap Kategori</h3>
        <ul className="text-xs text-blue-900 space-y-1">
          <li>🎯 <strong>Opportunity</strong>: prioritas hari ini — keyword hampir page 1, tinggal dorong sedikit</li>
          <li>⚠️ <strong>Low CTR</strong>: revisi seoTitle + seoDescription supaya lebih menarik</li>
          <li>🏆 <strong>Top 3</strong>: maintain dengan internal link + content refresh</li>
          <li>🥇 <strong>Page 1</strong>: tambah keyword di H2, expand konten untuk push ke top 3</li>
          <li>📍 <strong>Page 2-3</strong>: monitor + optimasi bertahap</li>
          <li>🔭 <strong>Deep</strong>: bahan riset untuk keyword baru atau strategy drop</li>
        </ul>
      </div>
    </div>
  );
}

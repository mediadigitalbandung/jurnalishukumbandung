"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  Workflow,
  Zap,
  Plug,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
  Shield,
  Sparkles,
  Printer,
  Layers,
  Lock,
  Server,
  Key,
  Code,
  Package,
  Component,
  Globe,
} from "lucide-react";

type TabKey =
  | "struktur"
  | "workflow"
  | "fitur"
  | "integrasi"
  | "api"
  | "components"
  | "deps"
  | "publik"
  | "cron"
  | "database"
  | "techstack"
  | "keamanan"
  | "deploy"
  | "reference"
  | "trouble";

interface SettingsMap {
  [key: string]: string;
}

export default function DokumentasiPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("struktur");
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success) setSettings(json.data || {});
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const has = (key: string) => !!settings[key]?.trim();

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "struktur", label: "Struktur & Peran", icon: Users },
    { key: "workflow", label: "Workflow Artikel", icon: Workflow },
    { key: "fitur", label: "Fitur Sistem", icon: Zap },
    { key: "integrasi", label: "Integrasi Eksternal", icon: Plug },
    { key: "api", label: "API Reference", icon: Code },
    { key: "components", label: "Components", icon: Component },
    { key: "deps", label: "Dependencies", icon: Package },
    { key: "publik", label: "Halaman Publik", icon: Globe },
    { key: "cron", label: "Cron Jobs", icon: Clock },
    { key: "database", label: "Database & Panel", icon: Database },
    { key: "techstack", label: "Tech Stack", icon: Layers },
    { key: "keamanan", label: "Keamanan", icon: Lock },
    { key: "deploy", label: "Deploy & Backup", icon: Server },
    { key: "reference", label: "Quick Reference", icon: Key },
    { key: "trouble", label: "Troubleshooting", icon: AlertTriangle },
  ];

  const renderTabContent = (key: TabKey) => {
    switch (key) {
      case "struktur": return <StrukturTab />;
      case "workflow": return <WorkflowTab />;
      case "fitur": return <FiturTab settings={settings} has={has} loading={loading} />;
      case "integrasi": return <IntegrasiTab settings={settings} has={has} loading={loading} />;
      case "api": return <ApiReferenceTab />;
      case "components": return <ComponentsTab />;
      case "deps": return <DepsTab />;
      case "publik": return <PublikTab />;
      case "cron": return <CronTab />;
      case "database": return <DatabaseTab />;
      case "techstack": return <TechStackTab />;
      case "keamanan": return <KeamananTab />;
      case "deploy": return <DeployTab />;
      case "reference": return <ReferenceTab />;
      case "trouble": return <TroubleTab />;
    }
  };

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(false), 500);
    }, 300);
  };

  return (
    <div className="mx-auto max-w-6xl print:max-w-none">
      <style jsx global>{`
        @media print {
          @page { margin: 15mm 12mm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          details { display: block !important; }
          details > summary { list-style: none; }
          details[open] + * { page-break-before: avoid; }
          details:not([open]) > :not(summary) { display: block !important; }
          details > :not(summary) { display: block !important; }
          .print-section { page-break-before: always; }
          .print-section:first-of-type { page-break-before: avoid; }
          .shadow-card { box-shadow: none !important; }
          .border { border: 1px solid #e5e7eb !important; }
          nav, header, aside, button { display: none !important; }
          .print-show-all summary::after { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-goto-light">
            <BookOpen size={24} className="text-goto-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">Dokumen Master JHB</h1>
            <p className="text-sm text-txt-secondary">
              Ringkasan lengkap struktur, fitur, integrasi, dan alur kerja sistem
            </p>
            <p className="mt-1 hidden text-xs text-txt-muted print:block">
              Dicetak: {new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })} · jurnalishukumbandung.com
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="no-print inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-green-dark"
        >
          <Printer size={16} />
          Cetak PDF
        </button>
      </div>

      {/* Info banner — only visible in print */}
      <div className="mb-6 hidden rounded-lg border border-border bg-surface-secondary p-4 text-xs text-txt-secondary print:block">
        <p><strong>Tips cetak ke PDF:</strong> Di dialog browser, pilih <em>Save as PDF</em> pada Destination. Aktifkan <em>Background graphics</em> agar warna & badge tercetak. Pilih ukuran kertas A4, margin Default.</p>
      </div>

      {/* Tabs — hidden in print */}
      <div className="no-print mb-5 overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
        <div className="flex min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  active
                    ? "border-goto-green text-goto-green bg-goto-light/50"
                    : "border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface-secondary"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {printMode ? (
        <div className="print-show-all space-y-10">
          {/* TOC */}
          <div className="print-section rounded-[12px] border border-border bg-surface p-6">
            <h2 className="mb-4 text-xl font-bold text-txt-primary">Daftar Isi</h2>
            <ol className="space-y-1.5 text-sm">
              {tabs.map((t, i) => (
                <li key={t.key}>
                  <span className="font-semibold text-goto-green">{i + 1}.</span>{" "}
                  <span className="text-txt-primary">{t.label}</span>
                </li>
              ))}
            </ol>
          </div>
          {tabs.map((t, i) => (
            <section key={t.key} className="print-section">
              <h2 className="mb-4 border-b-2 border-goto-green pb-2 text-xl font-bold text-txt-primary">
                {i + 1}. {t.label}
              </h2>
              {renderTabContent(t.key)}
            </section>
          ))}
        </div>
      ) : (
        renderTabContent(activeTab)
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. STRUKTUR & PERAN
// ════════════════════════════════════════════════════════════════

function StrukturTab() {
  const roles = [
    {
      name: "SUPER_ADMIN",
      label: "Super Admin",
      color: "bg-purple-100 text-purple-700 border-purple-300",
      icon: Shield,
      desc: "Akses penuh ke seluruh sistem. Bisa manage user, pengaturan, iklan, API keys, auto-artikel.",
      capabilities: [
        "Kelola semua user & role",
        "Ubah pengaturan sistem (API keys, SEO, sosmed)",
        "Kelola kategori, tags, iklan, polling",
        "Approve/Reject/Publish/Archive artikel apa saja",
        "Akses ke AI Log, SEO Monitor, Statistik Website",
        "Trigger cron manual (auto-artikel, sosmed)",
        "Takedown post sosmed, lihat audit log",
      ],
    },
    {
      name: "EDITOR",
      label: "Editor",
      color: "bg-blue-100 text-blue-700 border-blue-300",
      icon: Users,
      desc: "Review & publish artikel. Tidak bisa ubah pengaturan sistem.",
      capabilities: [
        "Review artikel IN_REVIEW dari Jurnalis",
        "Approve (publish) atau Reject artikel",
        "Kembalikan artikel ke Jurnalis untuk revisi",
        "Tulis artikel sendiri (langsung publish)",
        "Lihat dashboard statistik editor",
        "Akses Kategori, Komentar, Polling, Tags",
      ],
    },
    {
      name: "JOURNALIST",
      label: "Jurnalis",
      color: "bg-green-100 text-green-700 border-green-300",
      icon: FileText,
      desc: "Tulis artikel & submit review. Tidak bisa publish langsung.",
      capabilities: [
        "Buat draft artikel baru",
        "Edit artikel sendiri (DRAFT, REJECTED)",
        "Submit artikel untuk review (IN_REVIEW)",
        "Lihat riwayat review & feedback editor",
        "Akses dashboard pribadi",
      ],
    },
    {
      name: "CONTRIBUTOR",
      label: "Kontributor",
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: FileText,
      desc: "Sama seperti Jurnalis tapi biasanya freelance/eksternal.",
      capabilities: [
        "Buat draft artikel baru",
        "Edit artikel sendiri (DRAFT, REJECTED)",
        "Submit artikel untuk review",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-txt-primary">Hierarki Peran</h2>
        <p className="mb-4 text-sm text-txt-secondary">
          Sistem JHB memiliki 4 tingkat akses dengan kemampuan berbeda:
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-secondary p-4 text-sm font-medium">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">Super Admin</span>
          <ArrowRight size={16} className="text-txt-muted" />
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Editor</span>
          <ArrowRight size={16} className="text-txt-muted" />
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">Jurnalis</span>
          <ArrowRight size={16} className="text-txt-muted" />
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">Kontributor</span>
        </div>
      </div>

      {roles.map((r) => {
        const Icon = r.icon;
        return (
          <details
            key={r.name}
            className="group rounded-[12px] border border-border bg-surface shadow-card"
            open={r.name === "SUPER_ADMIN"}
          >
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-surface-secondary/50">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${r.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-semibold text-txt-primary">{r.label}</p>
                  <p className="text-xs text-txt-muted">{r.name}</p>
                </div>
              </div>
              <span className="text-xs text-txt-muted group-open:hidden">▾ Buka</span>
              <span className="hidden text-xs text-txt-muted group-open:inline">▴ Tutup</span>
            </summary>
            <div className="border-t border-border px-6 py-4">
              <p className="mb-3 text-sm text-txt-secondary">{r.desc}</p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-txt-muted">
                Kemampuan:
              </p>
              <ul className="space-y-1.5">
                {r.capabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-txt-primary">
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-goto-green" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        );
      })}

      {/* Permission matrix */}
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Matriks Izin Akses</h2>
        <p className="mb-4 text-sm text-txt-secondary">
          Tabel ringkas siapa bisa melakukan apa. ✓ = bisa, ✗ = tidak bisa, ○ = terbatas (lihat catatan).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border text-left text-xs font-semibold uppercase tracking-wider text-txt-muted">
                <th className="py-2 pr-3">Aksi</th>
                <th className="py-2 px-2 text-center">SuperAdmin</th>
                <th className="py-2 px-2 text-center">Editor</th>
                <th className="py-2 px-2 text-center">Jurnalis</th>
                <th className="py-2 px-2 text-center">Kontributor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Tulis artikel baru", "✓", "✓", "✓", "✓"],
                ["Edit artikel sendiri (DRAFT/REJECTED)", "✓", "✓", "✓", "✓"],
                ["Edit artikel orang lain", "✓", "✓", "✗", "✗"],
                ["Submit artikel untuk review", "✓", "✓", "✓", "✓"],
                ["Publish artikel langsung", "✓", "✓", "✗", "✗"],
                ["Approve artikel review", "✓", "✓", "✗", "✗"],
                ["Reject artikel review", "✓", "✓", "✗", "✗"],
                ["Archive / hide artikel publish", "✓", "✓", "✗", "✗"],
                ["Hapus artikel (permanent)", "✓", "✗", "✗", "✗"],
                ["Kelola kategori", "✓", "✓", "✗", "✗"],
                ["Kelola tags & keyword riset", "✓", "✓", "✗", "✗"],
                ["Moderasi komentar", "✓", "✓", "✗", "✗"],
                ["Kelola polling", "✓", "✓", "✗", "✗"],
                ["Kelola user & role", "✓", "✗", "✗", "✗"],
                ["Ubah pengaturan sistem + API keys", "✓", "✗", "✗", "✗"],
                ["Kelola iklan", "✓", "✗", "✗", "✗"],
                ["Auto-generate artikel AI", "✓", "✗", "✗", "✗"],
                ["Setup sosmed (IG/FB)", "✓", "✗", "✗", "✗"],
                ["Takedown post sosmed", "✓", "✗", "✗", "✗"],
                ["Akses audit log", "✓", "✗", "✗", "✗"],
                ["Akses statistik website", "✓", "✗", "✗", "✗"],
                ["Akses dokumen master", "✓", "✗", "✗", "✗"],
              ].map((row, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-txt-primary">{row[0]}</td>
                  {[1, 2, 3, 4].map((col) => (
                    <td key={col} className="py-2 px-2 text-center font-mono text-sm">
                      <span className={row[col] === "✓" ? "text-goto-green font-bold" : row[col] === "✗" ? "text-red-400" : "text-yellow-600"}>
                        {row[col]}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. WORKFLOW ARTIKEL
// ════════════════════════════════════════════════════════════════

function WorkflowTab() {
  const statuses = [
    { name: "DRAFT", color: "bg-gray-100 text-gray-700", desc: "Artikel sedang ditulis, belum di-submit" },
    { name: "IN_REVIEW", color: "bg-yellow-100 text-yellow-700", desc: "Menunggu review editor" },
    { name: "APPROVED", color: "bg-blue-100 text-blue-700", desc: "Disetujui editor, siap publish" },
    { name: "REJECTED", color: "bg-red-100 text-red-700", desc: "Ditolak editor, perlu revisi jurnalis" },
    { name: "PUBLISHED", color: "bg-green-100 text-green-700", desc: "Live di website" },
    { name: "ARCHIVED", color: "bg-zinc-100 text-zinc-700", desc: "Disembunyikan dari publik" },
  ];

  const autoActions = [
    { label: "Auto-SEO generate", detail: "seoTitle, seoDescription, Sorotan, FAQ dari AI (Claude Haiku)" },
    { label: "Submit ke Google", detail: "Indexing API + IndexNow (Bing) untuk penomoran cepat" },
    { label: "Auto-post Instagram", detail: "Render template + caption + hashtag, kirim via Meta Graph API" },
    { label: "Auto-post Facebook", detail: "Link share atau photo post sesuai kategori" },
    { label: "Auto-share Twitter/X", detail: "Tweet otomatis dengan link + hashtag brand" },
    { label: "Purge Cloudflare cache", detail: "Invalidate cache homepage + kategori + artikel" },
    { label: "Notifikasi penulis", detail: "Email + in-panel notification" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Alur Lifecycle Artikel</h2>
        <div className="mb-4 rounded-lg bg-surface-secondary p-4">
          <code className="text-xs text-txt-secondary">
            DRAFT → IN_REVIEW → (APPROVED → PUBLISHED) | (REJECTED → back to DRAFT) → ARCHIVED
          </code>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {statuses.map((s) => (
            <div key={s.name} className="rounded-lg border border-border p-3">
              <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>
                {s.name}
              </span>
              <p className="text-xs text-txt-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">
          Transisi Status & Pemicu
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-txt-muted">
                <th scope="col" className="py-2 pr-3">Dari</th>
                <th scope="col" className="py-2 pr-3">Ke</th>
                <th scope="col" className="py-2 pr-3">Siapa</th>
                <th scope="col" className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="py-2 pr-3">DRAFT</td><td className="py-2 pr-3">IN_REVIEW</td><td className="py-2 pr-3">Jurnalis</td><td className="py-2">Klik &quot;Kirim untuk Review&quot; di editor</td></tr>
              <tr><td className="py-2 pr-3">IN_REVIEW</td><td className="py-2 pr-3">PUBLISHED</td><td className="py-2 pr-3">Editor</td><td className="py-2">Klik &quot;Publish&quot; (auto-trigger SEO + sosmed)</td></tr>
              <tr><td className="py-2 pr-3">IN_REVIEW</td><td className="py-2 pr-3">REJECTED</td><td className="py-2 pr-3">Editor</td><td className="py-2">Klik &quot;Tolak&quot; dengan catatan revisi</td></tr>
              <tr><td className="py-2 pr-3">REJECTED</td><td className="py-2 pr-3">DRAFT</td><td className="py-2 pr-3">Jurnalis</td><td className="py-2">Edit ulang, auto kembali ke DRAFT</td></tr>
              <tr><td className="py-2 pr-3">DRAFT</td><td className="py-2 pr-3">PUBLISHED</td><td className="py-2 pr-3">Editor/Admin</td><td className="py-2">Publish langsung (skip review)</td></tr>
              <tr><td className="py-2 pr-3">PUBLISHED</td><td className="py-2 pr-3">ARCHIVED</td><td className="py-2 pr-3">Admin</td><td className="py-2">Sembunyikan dari publik (URL jadi 404)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">
          Aksi Otomatis saat Artikel Dipublish
        </h2>
        <p className="mb-4 text-sm text-txt-secondary">
          Saat status artikel jadi PUBLISHED, sistem otomatis menjalankan aksi-aksi berikut (non-blocking, paralel):
        </p>
        <div className="space-y-2">
          {autoActions.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-goto-green" />
              <div>
                <p className="text-sm font-semibold text-txt-primary">{a.label}</p>
                <p className="text-xs text-txt-secondary">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. FITUR SISTEM
// ════════════════════════════════════════════════════════════════

function FiturTab({ settings, has, loading }: { settings: SettingsMap; has: (k: string) => boolean; loading: boolean }) {
  const features = [
    {
      category: "Konten",
      items: [
        { name: "Editor artikel rich-text", status: true, detail: "TipTap dengan image crop, tabel, embed" },
        { name: "Autosave draft", status: true, detail: "Simpan otomatis tiap 15 detik + on beforeunload (aman dari VPS restart)" },
        { name: "Export PDF & Teks", status: true, detail: "Download artikel sebagai PDF/TXT dari panel" },
        { name: "Polling terintegrasi", status: true, detail: "Satu polling per artikel, auto-generate dari AI" },
        { name: "Sistem komentar", status: true, detail: "Moderasi + notifikasi, approve/reject" },
        { name: "Tags Manager + Riset Keyword AI", status: true, detail: "Kelola tags, riset keyword SEO, auto-tags" },
      ],
    },
    {
      category: "AI & Otomasi",
      items: [
        { name: "Auto-artikel AI", status: has("auto_article_enabled") && settings["auto_article_enabled"] === "true", detail: "Cron generate draft dari keyword target (Claude Haiku utama, DeepSeek fallback)" },
        { name: "Anthropic API (Claude)", status: has("anthropic_api_key"), detail: "Provider AI utama untuk semua fitur generate (artikel, SEO, caption)" },
        { name: "DeepSeek API", status: has("deepseek_api_key"), detail: "Fallback AI kalau Anthropic gagal" },
        { name: "SEO auto-generate", status: true, detail: "Title, description, Sorotan, FAQ otomatis saat publish" },
        { name: "Caption sosmed AI", status: true, detail: "Generate caption Instagram/Facebook dari konten artikel" },
      ],
    },
    {
      category: "SEO & Distribusi",
      items: [
        { name: "Sitemap otomatis", status: true, detail: "/sitemap.xml + news sitemap (2 hari terakhir)" },
        { name: "Structured data JSON-LD", status: true, detail: "Article, NewsArticle, BreadcrumbList, FAQPage, HowTo, QAPage" },
        { name: "Google Indexing API", status: has("google_indexing_enabled") && settings["google_indexing_enabled"] === "true", detail: "Submit artikel baru ke Google (butuh credentials)" },
        { name: "IndexNow (Bing)", status: true, detail: "Ping Bing setiap artikel publish" },
        { name: "Cloudflare cache purge", status: true, detail: "Invalidate cache homepage + category saat publish" },
        { name: "Internal linking", status: true, detail: "Auto-inject related article links di body" },
        { name: "Sorotan SEO pages", status: true, detail: "3 halaman substantif per artikel (kronologi/analisis/dampak)" },
      ],
    },
    {
      category: "Media Sosial",
      items: [
        { name: "Auto-post Instagram", status: has("meta_access_token"), detail: "Render template 4:5 + caption + hashtag via Meta Graph API" },
        { name: "Auto-post Facebook", status: has("meta_access_token"), detail: "Link share atau photo post dengan template" },
        { name: "Twitter/X auto-share", status: has("twitter_access_token"), detail: "Tweet otomatis dengan link artikel" },
        { name: "Template gambar sosmed", status: true, detail: "Kelola template PNG + text layers (Sharp rendering)" },
        { name: "Draft mode review", status: true, detail: "Toggle: preview + approve manual sebelum post" },
      ],
    },
    {
      category: "TikTok Video Auto-Content",
      items: [
        { name: "Editor video TikTok", status: true, detail: "Drag-drop clip + foto + backsong, drag text overlay free position, subtitle timeline" },
        { name: "Render engine FFmpeg", status: true, detail: "Default — cepat (~30s/video), composite via libavfilter (concat + drawtext + ken burns + xfade)" },
        { name: "Render engine HyperFrames", status: true, detail: "Premium — HTML+CSS+GSAP via headless Chrome (Node 22 + puppeteer-managed Chrome). Animasi text kinetic, transisi premium. Render 60-90s/video." },
        { name: "Frame templates (5 style)", status: true, detail: "ticker-news (LIVE bar), breaking-news (red banner), lower-third (branded card), brand-green (top JHB bar), minimal (watermark)" },
        { name: "AI subtitle timeline", status: true, detail: "Generate subtitle 3-15 segment dari artikel terkait, target durasi 15s-2min" },
        { name: "AI caption + hashtag", status: true, detail: "Auto-generate caption TikTok-style + 8-12 hashtag dari artikel" },
        { name: "Backsong library", status: true, detail: "Upload audio, kategori mood (serius/dramatis/santai/urgent), auto-fade out 1s" },
        { name: "Multi overlay PNG", status: true, detail: "Tambah PNG decals (logo, sticker) dengan posisi/scale/rotation/opacity custom" },
        { name: "Auto-publish TikTok", status: has("tiktok_access_token") || false, detail: "Upload ke TikTok Inbox via Content Posting API (butuh OAuth approval Meta)" },
      ],
    },
    {
      category: "Monitoring & Analytics",
      items: [
        { name: "Dashboard statistik", status: true, detail: "Artikel, views, pending review, trend mingguan" },
        { name: "Google Analytics", status: has("google_credentials_json"), detail: "Pageviews + top artikel dari GA4" },
        { name: "Google Search Console", status: has("google_credentials_json"), detail: "Impression, klik, CTR, position" },
        { name: "Cloudflare Analytics", status: has("cloudflare_api_token"), detail: "Bandwidth, cache hit rate" },
        { name: "AI usage log", status: true, detail: "Track pemakaian token API AI per fitur" },
        { name: "Audit log", status: true, detail: "Semua aksi user tercatat (create, update, delete, publish)" },
      ],
    },
    {
      category: "Sistem & Keamanan",
      items: [
        { name: "Autentikasi NextAuth", status: true, detail: "Login email/password, session JWT, role-based" },
        { name: "Password hashing bcrypt", status: true, detail: "12 rounds, aman dari rainbow table" },
        { name: "CSRF protection", status: true, detail: "Token per request untuk POST/PUT/DELETE" },
        { name: "Rate limiting", status: true, detail: "API AI dibatasi per user per jam" },
        { name: "Email notifikasi", status: has("resend_api_key"), detail: "Resend API untuk notify review/approve/reject" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {loading && (
        <div className="rounded-[12px] border border-border bg-surface p-4 text-sm text-txt-secondary shadow-card">
          Memuat status fitur...
        </div>
      )}
      {features.map((group) => (
        <div key={group.category} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">
              {group.category}
            </h3>
          </div>
          <div className="divide-y divide-border">
            {group.items.map((item) => (
              <div key={item.name} className="flex items-start gap-3 px-6 py-3">
                {item.status ? (
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-goto-green" />
                ) : (
                  <XCircle size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-txt-primary">{item.name}</p>
                  <p className="text-xs text-txt-secondary">{item.detail}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.status ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.status ? "Aktif" : "Belum aktif"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. INTEGRASI EKSTERNAL
// ════════════════════════════════════════════════════════════════

function IntegrasiTab({ settings, has, loading }: { settings: SettingsMap; has: (k: string) => boolean; loading: boolean }) {
  const integrations = [
    {
      name: "Anthropic (Claude)",
      role: "AI utama — artikel, SEO, caption",
      status: has("anthropic_api_key"),
      setupPath: "/panel/pengaturan",
      keys: ["anthropic_api_key"],
      notes: "Model: claude-haiku-4-5. Butuh akun Anthropic dengan billing aktif. Gratis tier terbatas — kalau habis, otomatis fallback ke DeepSeek.",
    },
    {
      name: "DeepSeek",
      role: "AI fallback",
      status: has("deepseek_api_key"),
      setupPath: "/panel/pengaturan",
      keys: ["deepseek_api_key"],
      notes: "Fallback otomatis kalau Anthropic gagal. Lebih murah tapi kualitas sedikit di bawah Claude.",
    },
    {
      name: "Meta Graph API (Instagram + Facebook)",
      role: "Auto-post sosmed",
      status: has("meta_access_token"),
      setupPath: "/panel/social",
      keys: ["meta_access_token", "ig_user_id", "fb_page_id"],
      notes: "Butuh Facebook App + Page + Instagram Business Account terhubung. Token expire setiap 60 hari — perlu refresh manual di Meta Business Suite.",
    },
    {
      name: "Google Search Console & Indexing API",
      role: "Submit artikel ke Google",
      status: has("google_credentials_json"),
      setupPath: "/panel/pengaturan",
      keys: ["google_credentials_json", "google_indexing_enabled"],
      notes: "Butuh service account JSON dari Google Cloud Console. Tambahkan service account sebagai Owner di Search Console. Tanpa ini, artikel baru tergantung crawl Google natural (lambat).",
    },
    {
      name: "Google Analytics 4 (GA4)",
      role: "Analytics traffic",
      status: has("google_credentials_json"),
      setupPath: "/panel/pengaturan",
      keys: ["google_credentials_json"],
      notes: "Pakai service account sama dengan Indexing API. Tambahkan sebagai Viewer di property GA4.",
    },
    {
      name: "Cloudflare",
      role: "CDN + cache purge",
      status: has("cloudflare_api_token"),
      setupPath: "/panel/pengaturan",
      keys: ["cloudflare_api_token", "cloudflare_zone_id"],
      notes: "Token dibuat di Cloudflare → My Profile → API Tokens dengan permission Zone.Cache Purge. Tanpa ini, update artikel tidak invalidate cache otomatis.",
    },
    {
      name: "Resend (Email)",
      role: "Notifikasi review/approve/reject",
      status: has("resend_api_key"),
      setupPath: "/panel/pengaturan",
      keys: ["resend_api_key", "notification_email_from"],
      notes: "Domain sender harus diverifikasi di Resend dashboard. Tanpa ini, notifikasi cuma muncul in-panel.",
    },
    {
      name: "Twitter/X API",
      role: "Auto-tweet artikel baru",
      status: has("twitter_access_token"),
      setupPath: "/panel/pengaturan",
      keys: ["twitter_bearer_token", "twitter_access_token", "twitter_access_secret", "twitter_consumer_key", "twitter_consumer_secret"],
      notes: "Developer Portal Twitter → Essential access minimum. OAuth 1.0a user context untuk POST /tweets.",
    },
    {
      name: "IndexNow (Bing)",
      role: "Submit artikel ke Bing/Yandex",
      status: true,
      setupPath: null,
      keys: [],
      notes: "Sudah aktif, tidak butuh API key. Key Bing sudah terverifikasi di public/indexnow-key.txt.",
    },
  ];

  return (
    <div className="space-y-4">
      {loading && (
        <div className="rounded-[12px] border border-border bg-surface p-4 text-sm text-txt-secondary shadow-card">
          Memuat status integrasi...
        </div>
      )}
      {integrations.map((i) => (
        <div key={i.name} className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-txt-primary">{i.name}</h3>
              <p className="text-xs text-txt-secondary">{i.role}</p>
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                i.status ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {i.status ? "✓ Terhubung" : "✗ Belum dikonfigurasi"}
            </span>
          </div>
          <p className="mb-3 text-sm text-txt-secondary">{i.notes}</p>
          {i.keys.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-txt-muted">
                Keys yang dibutuhkan:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {i.keys.map((k) => (
                  <code
                    key={k}
                    className={`rounded px-2 py-0.5 text-xs ${
                      has(k) ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {k}
                  </code>
                ))}
              </div>
            </div>
          )}
          {i.setupPath && (
            <a
              href={i.setupPath}
              className="inline-flex items-center gap-1 text-xs font-semibold text-goto-green hover:underline"
            >
              Setup di {i.setupPath} <ArrowRight size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 5. CRON JOBS
// ════════════════════════════════════════════════════════════════

function CronTab() {
  const crons = [
    {
      endpoint: "/api/cron/auto-article",
      purpose: "Generate artikel otomatis dari keyword target",
      schedule: "Sesuai config (default: tiap 1 jam)",
      howToRun: "Otomatis jika enabled di /panel/auto-artikel, atau manual klik 'Generate Draft'",
      notes: "Setiap run = 1 artikel draft. Output: artikel baru dengan status DRAFT (kategori + tags + featuredImage auto).",
    },
    {
      endpoint: "/api/cron/publish",
      purpose: "Publish artikel terjadwal (scheduledAt)",
      schedule: "Tiap 5 menit (external cron VPS)",
      howToRun: "Cronjob sistem di VPS. Bisa dipanggil manual via cURL dengan CRON_SECRET.",
      notes: "Cek artikel dengan status IN_REVIEW/APPROVED + scheduledAt <= now → ubah ke PUBLISHED + trigger onArticlePublished.",
    },
    {
      endpoint: "/api/cron/sorotan",
      purpose: "Generate Sorotan SEO untuk artikel yang belum punya",
      schedule: "Tiap 6 jam",
      howToRun: "Otomatis via cron VPS",
      notes: "Cari artikel PUBLISHED tanpa Sorotan → generate 3 sudut pandang (kronologi/analisis/dampak).",
    },
    {
      endpoint: "/api/cron/seo-submit",
      purpose: "Resubmit artikel yang gagal index ke Google",
      schedule: "Tiap 12 jam",
      howToRun: "Otomatis via cron VPS",
      notes: "Ambil artikel dengan indexStatus='failed' → retry Indexing API. Update ke 'submitted' atau tetap 'failed'.",
    },
    {
      endpoint: "/api/cron/backup",
      purpose: "Backup database + media ke storage",
      schedule: "Tiap 24 jam (dini hari)",
      howToRun: "Otomatis via cron VPS (pg_dump + rsync)",
      notes: "Simpan 7 hari terakhir. Media backup ke direktori terpisah.",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Cara setup cron di VPS:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-white px-3 py-2 text-xs">
{`# Edit crontab
crontab -e

# Tambahkan baris (contoh: publish tiap 5 menit)
*/5 * * * * curl -X POST https://jurnalishukumbandung.com/api/cron/publish \\
  -H "Authorization: Bearer \${CRON_SECRET}"`}
        </pre>
      </div>

      {crons.map((c) => (
        <div key={c.endpoint} className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center gap-3">
            <Clock size={18} className="text-goto-green" />
            <code className="rounded bg-surface-secondary px-2 py-1 text-sm font-semibold text-txt-primary">
              {c.endpoint}
            </code>
          </div>
          <p className="mb-3 text-sm text-txt-primary">{c.purpose}</p>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Jadwal</p>
              <p className="text-txt-secondary">{c.schedule}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Trigger</p>
              <p className="text-txt-secondary">{c.howToRun}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-txt-muted">Detail</p>
              <p className="text-txt-secondary">{c.notes}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 6. DATABASE & HALAMAN
// ════════════════════════════════════════════════════════════════

function DatabaseTab() {
  const detailedModels = [
    {
      name: "User",
      desc: "Akun user dengan role-based access",
      fields: [
        ["id", "String @id (cuid)"],
        ["email", "String @unique — email login"],
        ["password", "String — bcrypt hash 12 rounds"],
        ["name", "String — nama tampilan"],
        ["avatar", "String? — URL foto profil"],
        ["bio", "String? — bio singkat"],
        ["role", "String — SUPER_ADMIN | EDITOR | JOURNALIST | CONTRIBUTOR"],
        ["specialization", "String? — spesialisasi (pidana, perdata, dll)"],
        ["phone", "String? — nomor kontak"],
        ["organisasiPers", "String? — organisasi pers (PWI, AJI, dll)"],
        ["twoFactorEnabled", "Boolean — 2FA toggle (future)"],
        ["lastLoginAt", "DateTime? — waktu login terakhir"],
        ["articles", "Article[] — artikel ditulis user"],
        ["auditLogs", "AuditLog[] — aksi audit"],
      ],
    },
    {
      name: "Article",
      desc: "Konten artikel berita — entity utama sistem",
      fields: [
        ["id, title, slug, content, excerpt", "Identifier + konten body"],
        ["featuredImage", "URL gambar utama"],
        ["status", "DRAFT | IN_REVIEW | APPROVED | PUBLISHED | REJECTED | ARCHIVED"],
        ["verificationLabel", "VERIFIED | UNVERIFIED — badge kredibilitas"],
        ["readTime, viewCount", "Int — baca dalam menit + total views"],
        ["publishedAt, scheduledAt", "DateTime? — publish aktual + jadwal"],
        ["seoTitle, seoDescription", "String? — override SEO meta"],
        ["author, authorId", "Relation User — penulis utama"],
        ["coAuthors", "String? — co-author nama-nama"],
        ["category, categoryId", "Relation Category"],
        ["tags", "Tag[] many-to-many"],
        ["sources", "Source[] — narasumber"],
        ["corrections", "Correction[] — ralat setelah publish"],
        ["revisions", "Revision[] — riwayat edit"],
        ["comments", "Comment[] — diskusi pembaca"],
        ["reports", "Report[] — laporan pembaca"],
        ["reviewNote, reviewedBy, reviewedAt", "Editor workflow"],
        ["assignedEditorId", "Editor yang ditugaskan"],
        ["isAutoGenerated, sourceArticleId", "Flag + artikel sumber AI"],
        ["publishToInstagram, publishToFacebook", "Bool? — override per-artikel"],
        ["socialCaptions", "Json? — caption sosmed custom"],
        ["faqData", "String? — JSON-LD FAQ"],
        ["indexStatus, lastIndexedAt", "Google indexing tracking"],
        ["sorotan", "Sorotan[] — 3 halaman SEO substantif"],
        ["socialPosts", "SocialPost[] — record post sosmed"],
      ],
    },
    {
      name: "Category",
      desc: "Kategori artikel",
      fields: [
        ["id, name, slug", "Identifier"],
        ["description", "String? — deskripsi"],
        ["icon", "String? — nama lucide icon"],
        ["order", "Int — urutan tampilan"],
        ["articles", "Article[]"],
        ["polls", "Poll[]"],
      ],
    },
    {
      name: "Tag",
      desc: "Tag untuk pengelompokan + SEO keyword",
      fields: [
        ["id, name, slug", "Identifier"],
        ["articles", "Article[] many-to-many"],
      ],
    },
    {
      name: "Source",
      desc: "Narasumber artikel",
      fields: [
        ["id", "String @id"],
        ["name, title, institution", "Identitas narasumber"],
        ["url", "String? — link referensi"],
        ["article, articleId", "Relation Article"],
      ],
    },
    {
      name: "Correction",
      desc: "Ralat/update untuk artikel published",
      fields: [
        ["id, description", "Isi ralat"],
        ["article, articleId", "Relation"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "Revision",
      desc: "Riwayat versi artikel (audit edit)",
      fields: [
        ["id, content, title", "Snapshot konten + judul"],
        ["changedBy", "String — siapa yang edit"],
        ["article, articleId", "Relation"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "Comment",
      desc: "Komentar publik (threaded)",
      fields: [
        ["id, content", "Isi komentar"],
        ["authorName, authorEmail", "Identitas komentator"],
        ["isApproved", "Boolean — moderation flag"],
        ["parentId", "String? — untuk reply (self-relation)"],
        ["article, articleId", "Relation"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "Ad",
      desc: "Iklan banner/native",
      fields: [
        ["id, name", "Identifier"],
        ["type", "IMAGE | GIF | HTML"],
        ["imageUrl, htmlCode, targetUrl", "Konten + destinasi"],
        ["slot", "HEADER | SIDEBAR | IN_ARTICLE | FOOTER | BETWEEN_SECTIONS | POPUP | FLOATING_BOTTOM"],
        ["startDate, endDate", "Periode tayang"],
        ["isActive, priority", "Toggle + prioritas rotation"],
        ["impressions, clicks", "Int — tracking"],
        ["targetPages", "String[] — halaman spesifik"],
      ],
    },
    {
      name: "Poll + PollOption + PollVote",
      desc: "Sistem polling per artikel (1 artikel = 1 poll)",
      fields: [
        ["Poll: id, question, image, category, article (1:1 optional)", "Master polling"],
        ["Poll: isActive, order, options[]", "Status + daftar opsi"],
        ["PollOption: id, label, votes, poll, pollVotes[]", "Opsi jawaban + counter"],
        ["PollVote: id, optionId, ip, fingerprint", "Dedup vote per IP+fingerprint"],
      ],
    },
    {
      name: "Sorotan",
      desc: "3 halaman substantif SEO per artikel (angle berbeda)",
      fields: [
        ["id, slug", "Identifier"],
        ["title, content", "300-500 kata per angle"],
        ["angle", "kronologi | analisis | dampak"],
        ["article, articleId", "Relation parent"],
        ["indexStatus, lastIndexedAt", "Google indexing tracking"],
      ],
    },
    {
      name: "SocialPost",
      desc: "Record post ke IG/FB",
      fields: [
        ["id, article, articleId", "Identifier + relation"],
        ["platform", "instagram | facebook"],
        ["externalPostId, externalUrl", "ID & URL di Meta"],
        ["status", "draft | pending | success | failed | deleted"],
        ["postFormat", "photo | link_share | multi_photo | carousel"],
        ["captionFinal", "Text — caption yang dipost"],
        ["renderedImageUrl", "URL gambar hasil render template"],
        ["slidesCount", "Int? — untuk carousel"],
        ["publishedAt, scheduledFor", "DateTime? — timestamp"],
        ["errorMessage, retryCount", "Error tracking"],
      ],
    },
    {
      name: "SocialTemplate",
      desc: "Template gambar untuk render sosmed",
      fields: [
        ["id, name", "Identifier"],
        ["platform", "instagram | facebook | both"],
        ["aspectRatio", "4:5 | 1:1 | 1.91:1"],
        ["templateImageUrl", "PNG base template"],
        ["photoSlotX, Y, Width, Height", "Koordinat slot foto artikel"],
        ["textLayers", "Json — array {text, x, y, font, color, maxWidth}"],
        ["isActive, isDefault", "Flag aktif + default"],
      ],
    },
    {
      name: "SocialMediaSettings",
      desc: "Settings global sosmed",
      fields: [
        ["metaAccessToken, metaRefreshToken", "Token Meta Graph API"],
        ["fbPageId, fbPageName", "Target Facebook Page"],
        ["igUserId, igAccountName", "Target Instagram Business"],
        ["captionPromptTemplate, captionSafetyRules", "AI caption config"],
        ["fixedHashtagsBrand[]", "Hashtag brand yang selalu dipakai"],
        ["autoPublishEnabled, draftModeEnabled", "Master switch"],
        ["notificationEmail, notificationWebhookUrl", "Alert destination"],
      ],
    },
    {
      name: "InstagramSettings",
      desc: "Config khusus IG",
      fields: [
        ["enabled", "Toggle IG auto-post"],
        ["aspectRatio, resizeStrategy, jpegQuality", "Image spec"],
        ["watermarkPngUrl, watermarkConfig", "Watermark optional"],
        ["hashtagCountTarget, fixedHashtagsIg[]", "Target jumlah + hashtag fix"],
        ["captionToneOverride", "Tone AI (serius/santai)"],
        ["publishDelaySec", "Delay publish dari approve"],
      ],
    },
    {
      name: "FacebookSettings",
      desc: "Config khusus FB",
      fields: [
        ["enabled, defaultPostFormat", "Toggle + format default"],
        ["aspectRatio, resizeStrategy, jpegQuality", "Image spec"],
        ["hashtagCountTarget, fixedHashtagsFb[]", "Hashtag config"],
        ["linkPosition, utmParams", "Link placement + tracking"],
        ["categoryFormatOverride", "Json — format per kategori"],
      ],
    },
    {
      name: "Media",
      desc: "Library media upload",
      fields: [
        ["id, filename, url", "Identifier"],
        ["type, size", "MIME + byte size"],
        ["caption, source", "Deskripsi + atribusi"],
        ["uploadedBy, uploaderName", "Siapa upload"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "CourtSchedule",
      desc: "Jadwal sidang pengadilan",
      fields: [
        ["id, title", "Judul sidang"],
        ["court, courtType", "Nama + tipe pengadilan"],
        ["caseNumber, defendant, judge, agenda", "Detail kasus"],
        ["date, time, location", "Jadwal"],
        ["status", "scheduled | live | done | postponed"],
        ["isHighlight, articleSlug", "Flag + link artikel terkait"],
      ],
    },
    {
      name: "Report",
      desc: "Laporan pembaca untuk artikel",
      fields: [
        ["id, reason", "HOAX | INACCURATE | SARA | DEFAMATION | OTHER"],
        ["detail, email", "Penjelasan + kontak pelapor"],
        ["status", "PENDING | REVIEWED | RESOLVED | DISMISSED"],
        ["article, articleId", "Relation"],
      ],
    },
    {
      name: "AuditLog",
      desc: "Audit trail semua aksi sensitif",
      fields: [
        ["id, action", "create_article, update_user, delete_ad, dll"],
        ["entity, entityId", "Article, User, Ad, dll + ID"],
        ["detail", "Json? — payload sebelum/sesudah"],
        ["user, userId, ip", "Aktor + IP address"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "AIUsageLog",
      desc: "Tracking pemakaian AI per request",
      fields: [
        ["id, userId, userName", "Siapa pakai"],
        ["feature", "title-generate, caption-ig, sorotan, dll"],
        ["inputTokens, outputTokens, totalTokens", "Token usage"],
        ["articleTitle", "Konteks artikel"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "Notification",
      desc: "Notifikasi in-app untuk user",
      fields: [
        ["id, userId", "Target user"],
        ["type", "article_approved | article_rejected | article_published | article_in_review"],
        ["title, message, link", "Konten + action link"],
        ["isRead", "Boolean"],
        ["createdAt", "DateTime"],
      ],
    },
    {
      name: "SystemSetting",
      desc: "Key-value store untuk config global",
      fields: [
        ["id, key, value", "Simpel key-value"],
        ["Contoh key", "anthropic_api_key, cloudflare_zone_id, site_name, dll"],
      ],
    },
    {
      name: "TargetKeyword",
      desc: "Keyword SEO untuk auto-artikel",
      fields: [
        ["id, keyword", "Target keyword"],
        ["source", "manual | ai_research"],
        ["notes, isActive", "Catatan + toggle"],
      ],
    },
    {
      name: "RedaksiMember",
      desc: "Anggota tim redaksi (halaman publik)",
      fields: [
        ["id, position, name, desc", "Identitas + jabatan + bio"],
        ["photo", "URL foto"],
        ["order, isActive", "Urutan + toggle"],
      ],
    },
    {
      name: "ContactMessage",
      desc: "Pesan kontak dari publik",
      fields: [
        ["id, name, email, subject, message", "Konten pesan"],
        ["isRead", "Boolean"],
      ],
    },
    {
      name: "CtaTemplate",
      desc: "Template CTA overlay (iklan + konten)",
      fields: [
        ["id, name, imageUrl", "Identifier"],
        ["isActive, rotationWeight", "Toggle + bobot rotation"],
      ],
    },
  ];

  const panelPages = [
    { path: "/panel/dashboard", desc: "Ringkasan statistik + quick actions" },
    { path: "/panel/artikel", desc: "Daftar + edit + buat artikel" },
    { path: "/panel/kategori", desc: "Kelola kategori" },
    { path: "/panel/tags", desc: "Tags Manager + Riset Keyword AI + generate artikel dari tag" },
    { path: "/panel/komentar", desc: "Moderasi komentar" },
    { path: "/panel/laporan", desc: "Laporan konten dari pembaca" },
    { path: "/panel/iklan", desc: "Kelola iklan (banner, native)" },
    { path: "/panel/redaksi", desc: "Halaman tentang tim redaksi" },
    { path: "/panel/polling", desc: "Kelola polling + hasil voting" },
    { path: "/panel/statistik", desc: "Statistik website komprehensif (GA4 + GSC + Cloudflare + internal)" },
    { path: "/panel/statistik-editor", desc: "Statistik per editor/jurnalis" },
    { path: "/panel/aktivitas", desc: "Audit log sistem" },
    { path: "/panel/seo", desc: "SEO Monitor — indexing status, sitemap, health" },
    { path: "/panel/sorotan", desc: "Kelola Sorotan SEO pages" },
    { path: "/panel/auto-artikel", desc: "Auto-generate artikel AI — drafts, published, hidden" },
    { path: "/panel/social", desc: "Kelola post sosmed IG/FB + template" },
    { path: "/panel/ai-log", desc: "Log pemakaian AI API" },
    { path: "/panel/pengguna", desc: "Kelola user & role" },
    { path: "/panel/pengaturan", desc: "Settings sistem (API keys, site info)" },
    { path: "/panel/jadwal-sidang", desc: "Jadwal sidang pengadilan" },
    { path: "/panel/media", desc: "Media library (upload, organize)" },
    { path: "/panel/dokumentasi", desc: "Halaman ini — dokumen master sistem" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>{detailedModels.length} model</strong> di <code>prisma/schema.prisma</code> (PostgreSQL via Prisma ORM).
          Setiap model punya field detail — klik untuk expand. Untuk migrasi: <code>npx prisma db push</code>.
        </p>
      </div>

      <div className="rounded-[12px] border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">Model Database (field-level detail)</h3>
        </div>
        <div className="divide-y divide-border">
          {detailedModels.map((m, i) => (
            <details key={m.name} className="group" open={i < 2}>
              <summary className="flex cursor-pointer items-center justify-between px-6 py-3 hover:bg-surface-secondary/30">
                <div className="flex-1">
                  <p className="font-semibold text-txt-primary">{m.name}</p>
                  <p className="text-xs text-txt-secondary">{m.desc}</p>
                </div>
                <span className="text-xs text-txt-muted group-open:hidden">▾ {m.fields.length} field</span>
                <span className="hidden text-xs text-txt-muted group-open:inline">▴</span>
              </summary>
              <div className="border-t border-border bg-surface-secondary/20 px-6 py-3">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-border/50">
                    {m.fields.map(([field, desc]) => (
                      <tr key={field}>
                        <td className="py-1 pr-3 font-mono font-semibold text-txt-primary w-1/3 min-w-[160px]">{field}</td>
                        <td className="py-1 text-txt-secondary">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">Halaman Panel Admin</h3>
        </div>
        <div className="divide-y divide-border">
          {panelPages.map((p) => (
            <div key={p.path} className="flex items-start gap-3 px-6 py-2.5">
              <a
                href={p.path}
                className="flex-shrink-0 rounded bg-goto-light px-2 py-0.5 text-xs font-mono font-semibold text-goto-green hover:bg-goto-green hover:text-white"
              >
                {p.path}
              </a>
              <p className="text-xs text-txt-secondary">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 7. TECH STACK
// ════════════════════════════════════════════════════════════════

function TechStackTab() {
  const stack = [
    {
      layer: "Frontend",
      tech: [
        { name: "Next.js 14.2", detail: "App Router, Server Components, React 18" },
        { name: "TypeScript", detail: "Strict mode untuk type safety" },
        { name: "Tailwind CSS", detail: "Utility-first styling + custom design tokens (goto-green palette)" },
        { name: "TipTap", detail: "Rich text editor untuk artikel (extensions: Image, Table, Link, Underline)" },
        { name: "Lucide Icons", detail: "Icon set konsisten di seluruh UI" },
        { name: "Recharts", detail: "Chart library untuk dashboard statistik" },
      ],
    },
    {
      layer: "Backend",
      tech: [
        { name: "Next.js API Routes", detail: "Server-side handlers di /src/app/api/**" },
        { name: "Prisma ORM 5.22", detail: "Type-safe DB client, schema migrations" },
        { name: "PostgreSQL 16", detail: "Database utama (hosted di VPS)" },
        { name: "NextAuth.js", detail: "Session-based auth dengan JWT + credentials provider" },
        { name: "bcryptjs", detail: "Password hashing 12 rounds" },
        { name: "Zod", detail: "Runtime validation untuk API inputs" },
        { name: "Sharp", detail: "Image processing (template render, resize, JPEG compress)" },
      ],
    },
    {
      layer: "AI & Automasi",
      tech: [
        { name: "Anthropic SDK", detail: "Claude Haiku 4.5 — provider AI utama untuk semua generate" },
        { name: "DeepSeek API", detail: "Fallback AI (deepseek-chat) kalau Anthropic gagal/quota habis" },
        { name: "Shared AI client", detail: "src/lib/ai-client.ts — callAI() dengan auto-fallback" },
        { name: "Cron jobs", detail: "External crontab VPS trigger endpoints /api/cron/**" },
      ],
    },
    {
      layer: "Integrasi Eksternal",
      tech: [
        { name: "Meta Graph API v21", detail: "Instagram Business + Facebook Page publish" },
        { name: "Google Indexing API", detail: "Submit URL baru untuk index cepat" },
        { name: "Google Search Console API", detail: "Fetch impression, klik, CTR, position" },
        { name: "Google Analytics Data API", detail: "GA4 pageview + top pages" },
        { name: "Cloudflare API", detail: "Cache purge + analytics bandwidth" },
        { name: "Resend", detail: "Transactional email (notifikasi review/approve)" },
        { name: "Twitter/X API v2", detail: "Auto-tweet artikel (OAuth 1.0a user context)" },
        { name: "IndexNow", detail: "Bing/Yandex instant indexing (no auth)" },
      ],
    },
    {
      layer: "Infrastructure",
      tech: [
        { name: "VPS Ubuntu 24.04", detail: "Hostinger VPS — port 3001 (internal), 443 (public)" },
        { name: "PM2", detail: "Process manager cluster mode (4 instances)" },
        { name: "Nginx", detail: "Reverse proxy + SSL termination" },
        { name: "Cloudflare", detail: "CDN + DDoS protection + cache layer" },
        { name: "Let's Encrypt", detail: "SSL certificate auto-renewal via certbot" },
        { name: "GitHub", detail: "Source control — github.com/mediadigitalbandung/jurnalishukumbandung" },
      ],
    },
    {
      layer: "Dev Tools",
      tech: [
        { name: "Git", detail: "Version control, master branch deploy" },
        { name: "npm", detail: "Package manager" },
        { name: "ESLint", detail: "Code linting (Next.js config)" },
        { name: "Claude Code", detail: "AI-assisted development harness" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          Arsitektur: <strong>monolithic Next.js app</strong> — frontend + API routes + server components dalam satu codebase.
          Deploy sebagai single PM2 cluster di VPS, PostgreSQL di same-host.
        </p>
      </div>
      {stack.map((s) => (
        <div key={s.layer} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">{s.layer}</h3>
          </div>
          <div className="divide-y divide-border">
            {s.tech.map((t) => (
              <div key={t.name} className="flex items-start gap-3 px-6 py-3">
                <Layers size={16} className="mt-0.5 flex-shrink-0 text-goto-green" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-txt-primary">{t.name}</p>
                  <p className="text-xs text-txt-secondary">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Struktur Direktori</h2>
        <pre className="overflow-x-auto rounded-lg bg-surface-secondary p-4 text-xs font-mono text-txt-primary leading-relaxed">
{`jurnalishukumbandung/
├── prisma/
│   └── schema.prisma              # Definisi semua model DB
├── public/
│   ├── uploads/                   # User uploads (images, social)
│   └── indexnow-key.txt           # Bing IndexNow verification
├── src/
│   ├── app/
│   │   ├── api/                   # API routes (Next.js App Router)
│   │   │   ├── ai/                # AI generate endpoints
│   │   │   ├── articles/          # CRUD artikel
│   │   │   ├── cron/              # Cron job endpoints
│   │   │   ├── social/            # IG/FB auto-publish
│   │   │   └── ...
│   │   ├── panel/                 # Admin panel pages
│   │   │   ├── artikel/           # Editor artikel
│   │   │   ├── dokumentasi/       # Halaman ini
│   │   │   └── ...
│   │   ├── berita/[slug]/         # Halaman artikel publik
│   │   ├── page.tsx               # Homepage
│   │   └── layout.tsx             # Root layout
│   ├── components/
│   │   ├── artikel/               # ArticleCard, CopyProtection
│   │   ├── editor/                # RichTextEditor, ImageCropModal
│   │   ├── layout/                # Header, Footer, Sidebar
│   │   └── ui/                    # Toast, ConfirmDialog
│   └── lib/
│       ├── ai-client.ts           # Shared AI caller (Anthropic + DeepSeek)
│       ├── api-utils.ts           # requireAuth, requireRole, errorResponse
│       ├── auth.ts                # NextAuth config
│       ├── prisma.ts              # Prisma client singleton
│       ├── roles.ts               # Role constants
│       ├── seo-utils.ts           # SEO helpers, auto-generate, onArticlePublished
│       └── social/                # IG/FB publisher classes
├── .env                           # Environment variables (NOT committed)
├── CLAUDE.md                      # Instruksi Claude Code
└── package.json`}
        </pre>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 8. KEAMANAN
// ════════════════════════════════════════════════════════════════

function KeamananTab() {
  const security = [
    {
      category: "Autentikasi & Session",
      items: [
        { item: "Password hashing bcrypt 12 rounds", detail: "Tahan rainbow table + brute force basic. Password minimum 8 karakter disarankan." },
        { item: "Session JWT (NextAuth)", detail: "Signed dengan NEXTAUTH_SECRET di .env. Expire otomatis setelah 30 hari." },
        { item: "Invalidate session saat password reset", detail: "User harus login ulang. Session lama jadi invalid = auto signOut." },
        { item: "Email sebagai identifier unik", detail: "Tidak bisa duplikat. Lowercase normalisasi saat save." },
      ],
    },
    {
      category: "API Security",
      items: [
        { item: "requireAuth() di semua protected routes", detail: "Cek session valid, throw 401 jika tidak login." },
        { item: "requireRole([...]) untuk role-gated endpoints", detail: "Admin endpoint cuma SUPER_ADMIN, editor endpoint cuma EDITOR+." },
        { item: "Zod validation di POST/PUT", detail: "Input user divalidasi sebelum masuk Prisma — tolak payload malformed." },
        { item: "CSRF protection via NextAuth", detail: "POST otomatis butuh CSRF token dari session." },
        { item: "Rate limiting AI endpoints", detail: "Dibatasi per user per jam untuk cegah abuse." },
      ],
    },
    {
      category: "Data Protection",
      items: [
        { item: "API keys disimpan di SystemSetting DB", detail: "Tidak di source code. Hanya SUPER_ADMIN bisa read/write." },
        { item: "Masking sensitif di UI", detail: "API keys ditampilkan dengan toggle show/hide." },
        { item: ".env tidak di-commit", detail: "Ditambahkan ke .gitignore. DB credentials + NEXTAUTH_SECRET aman." },
        { item: "Sanitasi HTML konten artikel", detail: "TipTap + server-side cleanup. Cegah XSS injection via paste." },
        { item: "Service account JSON Google", detail: "Disimpan di DB (SystemSetting), bukan di filesystem." },
      ],
    },
    {
      category: "Infrastructure",
      items: [
        { item: "HTTPS wajib (Let's Encrypt)", detail: "Auto-renewal certbot. HTTP redirect ke HTTPS via nginx." },
        { item: "Cloudflare DDoS + WAF", detail: "Proxy depan, block IP abuse, rate limit per IP." },
        { item: "Firewall UFW di VPS", detail: "Port 22 (SSH), 80, 443 terbuka. PostgreSQL 5432 LOCAL-ONLY." },
        { item: "SSH key-only auth", detail: "Password SSH disabled di /etc/ssh/sshd_config." },
        { item: "Nginx security headers", detail: "X-Frame-Options, X-Content-Type-Options, Referrer-Policy." },
      ],
    },
    {
      category: "Audit & Logging",
      items: [
        { item: "AuditLog per aksi sensitif", detail: "Create/update/delete artikel, user, iklan tercatat dengan userId + timestamp." },
        { item: "AIUsageLog", detail: "Track setiap call AI: feature, user, article, sukses/gagal." },
        { item: "PM2 logs", detail: "Stdout/stderr aplikasi di /root/.pm2/logs/. Log rotation tiap 10MB." },
        { item: "Nginx access log", detail: "Semua request tercatat dengan IP, UA, response code." },
      ],
    },
    {
      category: "Best Practices untuk User",
      items: [
        { item: "Rotate API keys tiap 6 bulan", detail: "Anthropic, DeepSeek, Meta, Google — generate baru dan update di /panel/pengaturan." },
        { item: "Jangan share akun SUPER_ADMIN", detail: "Setiap user pegang akun sendiri. Audit log baru akurat." },
        { item: "Password kuat: 12+ karakter", detail: "Campuran huruf, angka, simbol. Hindari kata umum." },
        { item: "Logout di perangkat publik", detail: "Session 30 hari — jangan biarkan laptop umum tetap login." },
        { item: "Backup DB mingguan ke eksternal", detail: "Jangan hanya andalkan backup VPS. Tarik dump ke storage terpisah." },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        <p className="font-semibold">⚠️ Peringatan Penting</p>
        <p className="mt-1">
          Jangan pernah commit file <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env</code> ke Git.
          API keys yang bocor = potensi bill besar & takeover akun. Kalau tidak sengaja bocor: rotate segera di dashboard masing-masing (Anthropic, Meta, Google).
        </p>
      </div>
      {security.map((s) => (
        <div key={s.category} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">{s.category}</h3>
          </div>
          <div className="divide-y divide-border">
            {s.items.map((it) => (
              <div key={it.item} className="flex items-start gap-3 px-6 py-3">
                <Shield size={16} className="mt-0.5 flex-shrink-0 text-goto-green" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-txt-primary">{it.item}</p>
                  <p className="text-xs text-txt-secondary">{it.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 9. DEPLOY & BACKUP
// ════════════════════════════════════════════════════════════════

function DeployTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Info VPS</h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div><span className="font-semibold text-txt-muted">IP:</span> <code className="rounded bg-surface-secondary px-2 py-0.5" title="Cek di kontrol panel Hostinger">[VPS_IP — lihat Hostinger]</code></div>
          <div><span className="font-semibold text-txt-muted">Domain:</span> <code className="rounded bg-surface-secondary px-2 py-0.5">jurnalishukumbandung.com</code></div>
          <div><span className="font-semibold text-txt-muted">App dir:</span> <code className="rounded bg-surface-secondary px-2 py-0.5">/var/www/jhb</code></div>
          <div><span className="font-semibold text-txt-muted">PM2 process:</span> <code className="rounded bg-surface-secondary px-2 py-0.5">jhb</code> (cluster, 4 instances)</div>
          <div><span className="font-semibold text-txt-muted">Port internal:</span> <code className="rounded bg-surface-secondary px-2 py-0.5">3001</code></div>
          <div><span className="font-semibold text-txt-muted">OS:</span> Ubuntu 24.04 LTS</div>
          <div><span className="font-semibold text-txt-muted">Node:</span> v20.x LTS</div>
          <div><span className="font-semibold text-txt-muted">Database:</span> PostgreSQL 16 (localhost)</div>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Alur Deploy</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-goto-green text-xs font-bold text-white">1</span>
            <div>
              <p className="font-semibold text-txt-primary">Build lokal</p>
              <code className="mt-1 block rounded bg-surface-secondary p-2 text-xs">npx next build</code>
              <p className="mt-1 text-xs text-txt-secondary">Pastikan compile sukses sebelum deploy.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-goto-green text-xs font-bold text-white">2</span>
            <div>
              <p className="font-semibold text-txt-primary">Commit & push</p>
              <code className="mt-1 block rounded bg-surface-secondary p-2 text-xs whitespace-pre">{`git add [files]
git commit -m "feat/fix: deskripsi"
git push origin master`}</code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-goto-green text-xs font-bold text-white">3</span>
            <div>
              <p className="font-semibold text-txt-primary">Deploy ke VPS</p>
              <code className="mt-1 block rounded bg-surface-secondary p-2 text-xs whitespace-pre">{`ssh root@<VPS_IP> "cd /var/www/jhb && \\
  git pull origin master && \\
  npm install && \\
  rm -rf .next/types && \\
  npm run build && \\
  pm2 restart jhb"`}</code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-goto-green text-xs font-bold text-white">4</span>
            <div>
              <p className="font-semibold text-txt-primary">Verifikasi</p>
              <code className="mt-1 block rounded bg-surface-secondary p-2 text-xs">ssh root@&lt;VPS_IP&gt; &quot;pm2 list&quot;</code>
              <p className="mt-1 text-xs text-txt-secondary">Pastikan status <code>online</code> untuk semua instance jhb.</p>
            </div>
          </li>
        </ol>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Backup Strategy</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-txt-primary">Database backup</p>
            <code className="mt-1 block rounded bg-surface-secondary p-2 text-xs whitespace-pre">{`# Backup manual
pg_dump -U jhb_user jhb > /var/backups/jhb-$(date +%Y%m%d).sql

# Restore
psql -U jhb_user jhb < /var/backups/jhb-YYYYMMDD.sql`}</code>
            <p className="mt-1 text-xs text-txt-secondary">Retensi: 7 hari otomatis via cron. Untuk aman, tarik backup mingguan ke storage eksternal (Google Drive, S3).</p>
          </div>
          <div>
            <p className="font-semibold text-txt-primary">Media backup</p>
            <p className="text-xs text-txt-secondary">Folder <code>/var/www/jhb/public/uploads</code> berisi semua gambar user-uploaded. Sync ke backup server via rsync harian.</p>
          </div>
          <div>
            <p className="font-semibold text-txt-primary">Code backup</p>
            <p className="text-xs text-txt-secondary">Source code di GitHub (<code>github.com/mediadigitalbandung/jurnalishukumbandung</code>). Clone ulang jika VPS dibuild fresh.</p>
          </div>
          <div>
            <p className="font-semibold text-txt-primary">Settings & keys backup</p>
            <p className="text-xs text-txt-secondary">Tabel <code>SystemSetting</code> berisi semua API keys. Sudah di-backup bareng DB. JANGAN lupa backup file <code>.env</code> secara manual — tidak pernah masuk ke DB backup.</p>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Disaster Recovery</h2>
        <ol className="space-y-2 text-sm">
          <li><span className="font-semibold">1. VPS down:</span> Hubungi Hostinger support. Cek status di <code>hostinger.com/cpanel</code>.</li>
          <li><span className="font-semibold">2. Database corrupt:</span> <code>psql</code> restore dari backup terbaru. Data setelah backup bisa hilang.</li>
          <li><span className="font-semibold">3. Source code hilang:</span> <code>git clone</code> dari GitHub. Restore <code>.env</code> dari manual backup.</li>
          <li><span className="font-semibold">4. Domain expired:</span> Cek DNS di Cloudflare & renewal di registrar. Propagasi bisa sampai 24 jam.</li>
          <li><span className="font-semibold">5. SSL expired:</span> <code>certbot renew --force-renewal</code>. Biasanya auto-renewal jalan, cek cron via <code>crontab -l</code>.</li>
          <li><span className="font-semibold">6. Meta/Instagram token expired:</span> Refresh di Meta Business Suite, update di <code>/panel/pengaturan</code>.</li>
          <li><span className="font-semibold">7. AI quota habis:</span> Sistem otomatis fallback ke provider cadangan. Top-up di dashboard provider yang habis.</li>
        </ol>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 10. QUICK REFERENCE
// ════════════════════════════════════════════════════════════════

function ReferenceTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Settings Keys (SystemSetting)</h2>
        <p className="mb-3 text-sm text-txt-secondary">
          Keys yang disimpan di DB dan diakses via <code>/panel/pengaturan</code>:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left font-semibold uppercase tracking-wider text-txt-muted">
                <th className="py-2 pr-3">Key</th>
                <th className="py-2">Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {[
                ["site_name", "Nama situs (header, SEO)"],
                ["site_description", "Deskripsi default meta tag"],
                ["contact_email", "Email kontak redaksi"],
                ["alamat_redaksi", "Alamat untuk LocalBusiness schema"],
                ["website_url", "URL publik (jurnalishukumbandung.com)"],
                ["anthropic_api_key", "API key Claude (utama)"],
                ["deepseek_api_key", "API key DeepSeek (fallback)"],
                ["resend_api_key", "API key Resend untuk email"],
                ["notification_email_from", "Alamat sender email notifikasi"],
                ["enable_comments", "Toggle global komentar (true/false)"],
                ["enable_ai", "Toggle fitur AI global (true/false)"],
                ["maintenance_mode", "Aktifkan mode maintenance"],
                ["google_credentials_json", "Service account JSON (GSC + GA4 + Indexing)"],
                ["google_indexing_enabled", "Toggle auto-submit ke Google (true/false)"],
                ["cloudflare_api_token", "Token cache purge"],
                ["cloudflare_zone_id", "Zone ID domain di Cloudflare"],
                ["auto_article_enabled", "Toggle cron auto-artikel"],
                ["auto_article_count", "Jumlah artikel per cron run"],
                ["auto_article_interval", "Interval cron (menit)"],
                ["twitter_bearer_token", "Bearer token Twitter API"],
                ["twitter_access_token", "Access token user Twitter"],
                ["twitter_access_secret", "Access secret user Twitter"],
                ["twitter_consumer_key", "Consumer key app Twitter"],
                ["twitter_consumer_secret", "Consumer secret app Twitter"],
              ].map(([k, d]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3"><code className="rounded bg-surface-secondary px-1.5 py-0.5">{k}</code></td>
                  <td className="py-1.5 text-txt-secondary">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Environment Variables (.env)</h2>
        <p className="mb-3 text-sm text-txt-secondary">
          Variabel yang HARUS di-set di <code>.env</code> VPS (tidak di DB):
        </p>
        <pre className="overflow-x-auto rounded bg-surface-secondary p-3 text-xs font-mono">
{`DATABASE_URL="postgresql://jhb_user:PASSWORD@localhost:5432/jhb"
DIRECT_URL="postgresql://jhb_user:PASSWORD@localhost:5432/jhb"
NEXTAUTH_SECRET="..."   # random 32+ char string
NEXTAUTH_URL="https://jurnalishukumbandung.com"
NEXT_PUBLIC_APP_URL="https://jurnalishukumbandung.com"
CRON_SECRET="..."       # Bearer token untuk cron endpoints
UPLOAD_DIR="public/uploads"
NODE_ENV="production"`}
        </pre>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Command Reference</h2>
        <div className="space-y-3 text-xs">
          <div>
            <p className="mb-1 font-semibold text-txt-primary">Lokal (development)</p>
            <pre className="rounded bg-surface-secondary p-2 font-mono">{`npm install              # Install deps
npx prisma db push       # Sync schema ke DB
npx prisma studio        # GUI explore DB
npm run dev              # Dev server port 3000
npx next build           # Build production`}</pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-txt-primary">VPS (via SSH)</p>
            <pre className="rounded bg-surface-secondary p-2 font-mono">{`ssh root@<VPS_IP>
cd /var/www/jhb
git pull origin master
npm install
rm -rf .next/types       # Clear stale types
npm run build
pm2 restart jhb          # Restart app
pm2 list                 # Cek status
pm2 logs jhb --lines 100 # Cek log
pm2 monit                # Live monitor CPU/mem`}</pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-txt-primary">Database</p>
            <pre className="rounded bg-surface-secondary p-2 font-mono">{`psql -U jhb_user -d jhb            # Koneksi manual
pg_dump -U jhb_user jhb > bck.sql  # Backup
psql -U jhb_user jhb < bck.sql     # Restore`}</pre>
          </div>
          <div>
            <p className="mb-1 font-semibold text-txt-primary">SSL & Nginx</p>
            <pre className="rounded bg-surface-secondary p-2 font-mono">{`certbot renew --dry-run    # Test renewal
systemctl reload nginx     # Reload config
nginx -t                   # Validasi config`}</pre>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">URL Endpoint Penting</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-txt-muted">
              <th className="py-2 pr-3">URL</th>
              <th className="py-2">Fungsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              ["/sitemap.xml", "Sitemap utama untuk Google Search Console"],
              ["/sitemap-news.xml", "News sitemap (artikel 2 hari terakhir)"],
              ["/robots.txt", "Instruksi crawler (allow all + sitemap refs)"],
              ["/feed.xml atau /rss", "RSS feed (bila aktif)"],
              ["/api/cron/publish", "Trigger publish artikel scheduled"],
              ["/api/cron/auto-article", "Generate artikel AI"],
              ["/api/articles", "List/create artikel (auth required)"],
              ["/api/health atau /api/status", "Health check endpoint"],
            ].map(([u, d]) => (
              <tr key={u}>
                <td className="py-1.5 pr-3"><code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">{u}</code></td>
                <td className="py-1.5 text-xs text-txt-secondary">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-3 text-lg font-bold text-txt-primary">Kontak & Kredensial</h2>
        <div className="space-y-2 text-sm">
          <p><span className="font-semibold text-txt-muted">GitHub Repo:</span> <code>github.com/mediadigitalbandung/jurnalishukumbandung</code></p>
          <p><span className="font-semibold text-txt-muted">VPS Provider:</span> Hostinger (panel: hpanel.hostinger.com)</p>
          <p><span className="font-semibold text-txt-muted">Domain Registrar:</span> Cek di domain reseller</p>
          <p><span className="font-semibold text-txt-muted">DNS:</span> Cloudflare (dash.cloudflare.com)</p>
          <p><span className="font-semibold text-txt-muted">Meta Developer:</span> developers.facebook.com/apps</p>
          <p><span className="font-semibold text-txt-muted">Google Cloud Console:</span> console.cloud.google.com</p>
          <p><span className="font-semibold text-txt-muted">Anthropic Console:</span> console.anthropic.com</p>
          <p><span className="font-semibold text-txt-muted">DeepSeek Platform:</span> platform.deepseek.com</p>
          <p><span className="font-semibold text-txt-muted">Resend Dashboard:</span> resend.com/emails</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 11. TROUBLESHOOTING
// ════════════════════════════════════════════════════════════════

function TroubleTab() {
  const issues = [
    {
      problem: "Naskah hilang saat error/restart VPS",
      solution: "Sudah otomatis tersimpan di browser (localStorage, tiap 15 detik). Saat buka lagi halaman edit, muncul banner kuning 'Pulihkan' — klik untuk recover.",
      severity: "info",
    },
    {
      problem: "Auto-post Instagram tidak muncul template di preview panel",
      solution: "Pastikan sudah ada template aktif & default di /panel/social tab Templates. Template harus platform='instagram' atau 'both', aspectRatio sesuai settings IG (default 4:5).",
      severity: "warning",
    },
    {
      problem: "Status post sosmed 'Pending' terus",
      solution: "Post 'pending' berarti proses publish crash di tengah jalan (biasanya VPS restart). Cek di DB: post dengan pending > 1 jam dianggap gagal. Hapus/retry lewat panel.",
      severity: "warning",
    },
    {
      problem: "AI error / timeout",
      solution: "Sistem pakai Anthropic (utama) → DeepSeek (fallback) otomatis. Cek /panel/pengaturan → pastikan minimal 1 API key terisi. Kalau Anthropic quota habis, otomatis pakai DeepSeek.",
      severity: "info",
    },
    {
      problem: "Build VPS gagal: 'pages-manifest.json not found'",
      solution: "Jalankan di VPS: rm -rf /var/www/jhb/.next && cd /var/www/jhb && npm run build. Ini fresh build tanpa cache stale.",
      severity: "warning",
    },
    {
      problem: "Build VPS gagal: '.next/export rename ENOENT'",
      solution: "Sama seperti di atas — rm -rf .next lalu build ulang. Biasanya karena interrupt saat build sebelumnya.",
      severity: "warning",
    },
    {
      problem: "Artikel tidak muncul di Google setelah publish",
      solution: "1) Cek /panel/seo — status indexing. 2) Pastikan Google Indexing API terkonfigurasi di /panel/pengaturan. 3) Submit manual di Google Search Console kalau belum terdaftar.",
      severity: "info",
    },
    {
      problem: "Cache lama muncul terus di website",
      solution: "Cek Cloudflare API token di /panel/pengaturan. Kalau belum aktif, purge manual: Cloudflare dashboard → Caching → Purge Everything.",
      severity: "info",
    },
    {
      problem: "Instagram token expire (post gagal 'Session expired')",
      solution: "Token Meta expire tiap 60 hari. Refresh di Meta Business Suite → Instagram → Settings → Extend Access Token. Copy token baru ke /panel/pengaturan → meta_access_token.",
      severity: "warning",
    },
    {
      problem: "Editor artikel lemot di tab banyak",
      solution: "TipTap editor load ~500KB. Tutup tab lain atau restart browser. Autosave tetap jalan, jadi aman.",
      severity: "info",
    },
    {
      problem: "User baru tidak bisa login",
      solution: "Pastikan password user sudah di-set (bukan null). Admin bisa reset password di /panel/pengguna → edit user → Reset Password.",
      severity: "info",
    },
    {
      problem: "Artikel auto-generated (AI) kualitas rendah",
      solution: "Refine target keyword di /panel/tags → tab Riset Keyword. Gunakan keyword spesifik (contoh: 'sidang korupsi PN Bandung' bukan 'hukum'). Makin spesifik makin bagus.",
      severity: "info",
    },
    {
      problem: "PM2 restart error / app tidak naik",
      solution: "SSH ke VPS, jalankan: pm2 delete jhb && cd /var/www/jhb && pm2 start npm --name jhb -i 4 -- start. Cek log dengan pm2 logs jhb --err. Kalau tetap gagal, pm2 kill dulu sebelum start ulang.",
      severity: "warning",
    },
    {
      problem: "Database connection refused",
      solution: "Cek PostgreSQL jalan: systemctl status postgresql. Restart: systemctl restart postgresql. Pastikan DATABASE_URL di .env VPS benar (password, host=localhost, port=5432).",
      severity: "error",
    },
    {
      problem: "Upload gambar gagal / 413 Request Entity Too Large",
      solution: "Cek nginx config /etc/nginx/sites-available/jhb — pastikan client_max_body_size 20M; atau lebih. Reload nginx: systemctl reload nginx. Max upload JHB default 10MB.",
      severity: "warning",
    },
    {
      problem: "SSL expired / site tidak bisa diakses HTTPS",
      solution: "certbot renew --force-renewal. Kalau gagal, cek DNS Cloudflare — harus 'DNS only' (abu-abu) saat renewal, bukan 'Proxied' (oranye). Setelah renew sukses, kembalikan ke Proxied.",
      severity: "error",
    },
    {
      problem: "Cloudflare cache tidak terpurge otomatis",
      solution: "Cek cloudflare_api_token di /panel/pengaturan. Token harus punya permission Zone.Cache Purge. Purge manual lewat dashboard Cloudflare kalau urgent.",
      severity: "info",
    },
    {
      problem: "Email notifikasi tidak terkirim",
      solution: "Cek resend_api_key di /panel/pengaturan. Pastikan domain sender sudah diverifikasi di dashboard Resend. Cek juga log Resend untuk bounce/spam detection.",
      severity: "info",
    },
    {
      problem: "Google Indexing API error 403",
      solution: "Service account belum ditambahkan sebagai 'Owner' di Google Search Console. Buka GSC → Settings → Users and permissions → Add service account email sebagai Owner.",
      severity: "warning",
    },
    {
      problem: "Bundle size besar / halaman lemot loading",
      solution: "Jalankan npx next build dan cek report 'First Load JS'. Untuk halaman >300KB, pertimbangkan dynamic import untuk komponen berat (editor, chart). Gunakan /panel/statistik untuk monitor Core Web Vitals.",
      severity: "info",
    },
    {
      problem: "Post sosmed duplikat (muncul 2x di IG/FB)",
      solution: "Cek /panel/social tab Logs — kalau ada 2 entry dengan status 'success' waktu mirip, delete salah satu di platform manually + klik 'Tandai Dihapus' di panel. Biasanya karena retry setelah timeout.",
      severity: "warning",
    },
    {
      problem: "Komentar spam membanjiri",
      solution: "Aktifkan moderasi wajib: semua komentar masuk ke /panel/komentar untuk di-approve manual. Ban IP via Cloudflare kalau ekstrem. Pertimbangkan rate-limit per IP di API comment.",
      severity: "warning",
    },
    {
      problem: "Prisma error: 'Schema drift detected'",
      solution: "Schema DB beda dengan schema.prisma. Jalankan npx prisma db push untuk sync (hati-hati: bisa hilang data kalau kolom berubah). Untuk production, pakai migration: npx prisma migrate deploy.",
      severity: "error",
    },
    {
      problem: "Token Meta / IG expired (error 'Session has expired')",
      solution: "Token Meta long-lived expire tiap 60 hari. Refresh di Meta Business Suite → Settings → System Users → Generate New Token. Copy ke /panel/pengaturan → meta_access_token.",
      severity: "warning",
    },
    {
      problem: "Sitemap tidak ter-update ke Google",
      solution: "Sitemap dynamic di /sitemap.xml. Submit manual ulang di Google Search Console → Sitemaps → Resubmit. Cek robots.txt juga sudah reference ke sitemap dengan benar.",
      severity: "info",
    },
    {
      problem: "Gambar artikel tidak muncul setelah publish",
      solution: "Cek featuredImage URL masih valid (bukan dari upload yg ke-delete). Cek permission folder /var/www/jhb/public/uploads — harus dimiliki www-data atau user yang jalanin Node. chmod 755 + chown www-data.",
      severity: "warning",
    },
    {
      problem: "Font custom tidak load di halaman publik",
      solution: "Pastikan next/font config di src/app/layout.tsx benar. Cek juga preconnect ke Google Fonts di <head>. Clear Cloudflare cache setelah update font untuk fresh delivery.",
      severity: "info",
    },
  ];

  const severityClass = (s: string) =>
    s === "warning"
      ? "border-yellow-300 bg-yellow-50"
      : s === "error"
      ? "border-red-300 bg-red-50"
      : "border-blue-300 bg-blue-50";

  return (
    <div className="space-y-3">
      <div className="rounded-[12px] border border-border bg-surface p-4 text-sm text-txt-secondary shadow-card">
        <p>
          Masalah umum dan solusinya. Kalau masalah baru belum ada di sini, cek{" "}
          <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">pm2 logs jhb</code> di VPS
          atau lapor ke developer.
        </p>
      </div>
      {issues.map((i, idx) => (
        <details
          key={idx}
          className={`group rounded-[12px] border ${severityClass(i.severity)} px-5 py-3`}
        >
          <summary className="cursor-pointer list-none">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className={`mt-0.5 flex-shrink-0 ${
                  i.severity === "warning"
                    ? "text-yellow-600"
                    : i.severity === "error"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              />
              <p className="flex-1 text-sm font-semibold text-txt-primary">{i.problem}</p>
              <span className="text-xs text-txt-muted group-open:hidden">▾</span>
              <span className="hidden text-xs text-txt-muted group-open:inline">▴</span>
            </div>
          </summary>
          <div className="mt-3 pl-8 text-sm text-txt-secondary">{i.solution}</div>
        </details>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 12. API REFERENCE (semua 75+ endpoint)
// ════════════════════════════════════════════════════════════════

function ApiReferenceTab() {
  const methodColor = (m: string) =>
    m === "GET" ? "bg-blue-100 text-blue-700"
    : m === "POST" ? "bg-green-100 text-green-700"
    : m === "PUT" ? "bg-yellow-100 text-yellow-700"
    : m === "PATCH" ? "bg-purple-100 text-purple-700"
    : m === "DELETE" ? "bg-red-100 text-red-700"
    : "bg-gray-100 text-gray-700";

  const authColor = (a: string) =>
    a === "public" ? "text-gray-500"
    : a === "auth" ? "text-blue-600"
    : a.includes("SUPER") ? "text-purple-600"
    : a.includes("EDITOR") ? "text-blue-600"
    : a.includes("JOURNALIST") ? "text-green-600"
    : a.includes("CRON") ? "text-orange-600"
    : "text-gray-600";

  const groups: { name: string; endpoints: [string, string, string, string][] }[] = [
    {
      name: "Articles",
      endpoints: [
        ["GET", "/api/articles", "public", "List artikel published dengan filter kategori/author/status"],
        ["POST", "/api/articles", "JOURNALIST+", "Buat artikel baru"],
        ["GET", "/api/articles/:id", "public", "Detail artikel + increment viewCount"],
        ["PUT", "/api/articles/:id", "JOURNALIST+", "Update/approve/publish/reject artikel"],
        ["PATCH", "/api/articles/:id", "EDITOR+", "Assign editor ke artikel"],
        ["DELETE", "/api/articles/:id", "owner/ADMIN", "Hapus artikel (cascade Source, Tag, Revision)"],
        ["POST", "/api/articles/bulk", "EDITOR+", "Buat banyak artikel sekaligus"],
        ["POST", "/api/articles/by-slugs", "public", "Ambil artikel dari array slug (untuk embed)"],
        ["POST", "/api/articles/toggle-visibility", "JOURNALIST+", "Hide/unhide artikel published (ARCHIVED)"],
        ["GET", "/api/articles/:id/revisions", "JOURNALIST+", "Riwayat revisi per artikel"],
        ["GET", "/api/articles/:id/comments", "public", "List komentar artikel"],
        ["POST", "/api/articles/:id/comments", "public", "Tambah komentar di artikel"],
      ],
    },
    {
      name: "AI",
      endpoints: [
        ["POST", "/api/ai/generate", "JOURNALIST+", "Generate teks via Claude (feature: title/meta/caption)"],
        ["POST", "/api/ai/bulk-tags", "EDITOR+", "Auto-generate tags batch untuk artikel"],
        ["GET", "/api/ai/usage", "SUPER_ADMIN", "Statistik pemakaian token AI"],
      ],
    },
    {
      name: "Categories & Tags",
      endpoints: [
        ["GET", "/api/categories", "public", "List semua kategori"],
        ["POST", "/api/categories", "EDITOR+", "Buat kategori baru"],
        ["PUT", "/api/categories/:id", "EDITOR+", "Edit kategori"],
        ["DELETE", "/api/categories/:id", "EDITOR+", "Hapus kategori"],
        ["GET", "/api/tags", "public", "List semua tag"],
        ["POST", "/api/tags", "JOURNALIST+", "Buat tag baru"],
        ["DELETE", "/api/tags", "SUPER_ADMIN", "Bulk delete tags"],
        ["GET", "/api/tags/articles", "public", "Artikel berdasarkan tag"],
        ["GET", "/api/tags/stats", "public", "Statistik pemakaian tag"],
        ["POST", "/api/tags/research", "EDITOR+", "AI riset keyword untuk tag"],
      ],
    },
    {
      name: "SEO & Indexing",
      endpoints: [
        ["POST", "/api/seo/submit", "EDITOR+", "Submit artikel ke Google Search Console"],
        ["POST", "/api/seo/ping", "CRON", "Ping search engines"],
        ["GET", "/api/seo/status", "EDITOR+", "Status indexing artikel"],
        ["GET", "/api/seo/sorotan-status", "EDITOR+", "Status indexing sorotan pages"],
        ["POST", "/api/seo/sorotan-status", "EDITOR+", "Update status indexing sorotan"],
        ["POST", "/api/seo/batch-index", "EDITOR+", "Batch submit artikel ke Google"],
        ["POST", "/api/seo/bulk-reindex", "SUPER_ADMIN", "Reindex semua artikel"],
        ["POST", "/api/seo/generate-sorotan", "EDITOR+", "Generate sorotan batch"],
        ["POST", "/api/seo/generate-sorotan-single", "EDITOR+", "Generate 1 sorotan (retry-able)"],
        ["POST", "/api/seo/test-credentials", "SUPER_ADMIN", "Test kredensial Google"],
      ],
    },
    {
      name: "Social Media",
      endpoints: [
        ["GET", "/api/social/posts", "EDITOR+", "List post sosmed + stats"],
        ["POST", "/api/social/posts/:id/approve", "EDITOR+", "Approve draft → publish ke Meta"],
        ["POST", "/api/social/posts/:id/reject", "EDITOR+", "Tolak draft (delete DB + image)"],
        ["POST", "/api/social/posts/:id/mark-deleted", "EDITOR+", "Tandai post dihapus manual di IG/FB"],
        ["POST", "/api/social/posts/:id/takedown", "EDITOR+", "Hapus post di platform via API (FB only)"],
        ["GET", "/api/social/settings", "SUPER_ADMIN", "Get settings global/IG/FB"],
        ["PUT", "/api/social/settings", "SUPER_ADMIN", "Update settings (scope: global/instagram/facebook)"],
        ["GET", "/api/social/templates", "EDITOR+", "List template gambar"],
        ["POST", "/api/social/templates", "EDITOR+", "Buat template baru"],
        ["GET", "/api/social/templates/:id", "EDITOR+", "Get template detail"],
        ["PUT", "/api/social/templates/:id", "EDITOR+", "Update template"],
        ["DELETE", "/api/social/templates/:id", "EDITOR+", "Hapus template"],
        ["POST", "/api/social/templates/preview", "EDITOR+", "Preview render template + artikel"],
        ["POST", "/api/social/preview", "EDITOR+", "Preview caption + image (no post)"],
        ["POST", "/api/social/test-publish", "SUPER_ADMIN", "Test publish artikel terbaru ke IG+FB"],
      ],
    },
    {
      name: "Ads, Polls, Comments",
      endpoints: [
        ["GET", "/api/ads", "public", "Iklan aktif (filter slot, targetPages)"],
        ["POST", "/api/ads", "SUPER_ADMIN", "Buat iklan baru"],
        ["PUT", "/api/ads/:id", "SUPER_ADMIN", "Update iklan"],
        ["DELETE", "/api/ads/:id", "SUPER_ADMIN", "Hapus iklan"],
        ["POST", "/api/ads/:id/track", "public", "Track click/impression"],
        ["GET", "/api/polls", "public", "List polling aktif"],
        ["POST", "/api/polls", "EDITOR+", "Buat polling baru"],
        ["PUT", "/api/polls/:id", "EDITOR+", "Update polling"],
        ["DELETE", "/api/polls/:id", "EDITOR+", "Hapus polling"],
        ["POST", "/api/polls/:id/vote", "public", "Vote (dedup IP+fingerprint)"],
        ["GET", "/api/polls/:id/vote", "public", "Hasil polling real-time"],
        ["GET", "/api/polls/from-article", "public", "Polling dari artikel tertentu"],
        ["POST", "/api/polls/from-article", "EDITOR+", "Generate polling dari artikel via AI"],
        ["GET", "/api/comments", "public", "List komentar (all/filter)"],
        ["POST", "/api/comments", "public", "Submit komentar (auto-moderate)"],
        ["PUT", "/api/comments/:id", "EDITOR+", "Approve/reject komentar"],
        ["DELETE", "/api/comments/:id", "EDITOR+", "Hapus komentar"],
      ],
    },
    {
      name: "Users & Auth",
      endpoints: [
        ["GET", "/api/users", "SUPER_ADMIN", "List semua user"],
        ["POST", "/api/users", "SUPER_ADMIN", "Buat user baru"],
        ["PUT", "/api/users/:id", "self/ADMIN", "Update profile user"],
        ["DELETE", "/api/users/:id", "SUPER_ADMIN", "Hapus user"],
        ["GET", "/api/users/me", "auth", "Profile user yang login"],
        ["PUT", "/api/users/me", "auth", "Update profile sendiri"],
        ["POST", "/api/auth/[...nextauth]", "public", "NextAuth handler (signin/signout/session)"],
        ["POST", "/api/auth/logout", "auth", "Sign out + invalidate session"],
      ],
    },
    {
      name: "Statistics & Analytics",
      endpoints: [
        ["GET", "/api/stats/internal", "EDITOR+", "Stats internal DB (artikel, views, users)"],
        ["GET", "/api/stats/cloudflare", "EDITOR+", "Analytics Cloudflare (bandwidth, cache hit)"],
        ["GET", "/api/stats/google-analytics", "EDITOR+", "Data GA4 (pageviews, top pages)"],
        ["GET", "/api/stats/google-search", "EDITOR+", "Data GSC (impression, klik, CTR, position)"],
      ],
    },
    {
      name: "Media & Upload",
      endpoints: [
        ["GET", "/api/media", "JOURNALIST+", "List media library"],
        ["POST", "/api/media", "JOURNALIST+", "Upload media (with metadata)"],
        ["PUT", "/api/media/:id", "uploader", "Update caption/source media"],
        ["DELETE", "/api/media", "JOURNALIST+", "Bulk delete media"],
        ["POST", "/api/upload", "JOURNALIST+", "Upload file langsung (raw)"],
      ],
    },
    {
      name: "Court, Reports, Redaksi",
      endpoints: [
        ["GET", "/api/court-schedule", "public", "List jadwal sidang"],
        ["POST", "/api/court-schedule", "JOURNALIST+", "Tambah jadwal"],
        ["PUT", "/api/court-schedule/:id", "JOURNALIST+", "Update jadwal"],
        ["DELETE", "/api/court-schedule/:id", "JOURNALIST+", "Hapus jadwal"],
        ["GET", "/api/reports", "EDITOR+", "List laporan pembaca"],
        ["POST", "/api/reports", "public", "Kirim laporan artikel"],
        ["PATCH", "/api/reports/:id", "EDITOR+", "Update status laporan"],
        ["GET", "/api/redaksi", "public", "List anggota redaksi"],
        ["POST", "/api/redaksi", "SUPER_ADMIN", "Tambah anggota"],
        ["PUT", "/api/redaksi/:id", "SUPER_ADMIN", "Update anggota"],
        ["DELETE", "/api/redaksi/:id", "SUPER_ADMIN", "Hapus anggota"],
      ],
    },
    {
      name: "System & Settings",
      endpoints: [
        ["GET", "/api/settings", "SUPER_ADMIN", "Semua system settings key-value"],
        ["PUT", "/api/settings", "SUPER_ADMIN", "Update 1 setting (key, value)"],
        ["GET", "/api/audit-logs", "SUPER_ADMIN", "Audit log (filter user, action, entity)"],
        ["GET", "/api/notifications", "auth", "Notifikasi user"],
        ["PATCH", "/api/notifications", "auth", "Mark read (single/all)"],
        ["GET", "/api/target-keywords", "EDITOR+", "List keyword target SEO"],
        ["POST", "/api/target-keywords", "EDITOR+", "Tambah keyword"],
        ["PATCH", "/api/target-keywords", "EDITOR+", "Update isActive keyword"],
        ["DELETE", "/api/target-keywords", "SUPER_ADMIN", "Hapus keyword"],
        ["POST", "/api/contact", "public", "Submit kontak form"],
        ["GET", "/api/search", "public", "Global search artikel"],
        ["GET", "/api/search/suggest", "public", "Autocomplete search"],
        ["GET", "/api/trending", "public", "Trending artikel (viewCount)"],
        ["GET", "/api/setup", "public", "Cek status setup (first-time install)"],
      ],
    },
    {
      name: "Cron (wajib Bearer CRON_SECRET)",
      endpoints: [
        ["GET/POST", "/api/cron/publish", "CRON", "Publish artikel scheduled + trigger auto-actions"],
        ["GET/POST", "/api/cron/auto-article", "CRON", "Generate artikel dari keyword target (AI)"],
        ["GET", "/api/cron/seo-ping", "CRON", "Ping GSC + IndexNow untuk artikel yang belum ter-index"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>75+ REST API endpoints</strong> diorganisir dalam 12 grup.
          Semua endpoint kecuali yang public butuh session NextAuth (cookie <code>next-auth.session-token</code>).
          Cron endpoint butuh header <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code>.
          Format response: <code>{"{ success: boolean, data?, error? }"}</code>
        </p>
      </div>

      {groups.map((g) => (
        <details key={g.name} className="rounded-[12px] border border-border bg-surface shadow-card" open>
          <summary className="cursor-pointer border-b border-border px-5 py-3 hover:bg-surface-secondary/50">
            <span className="text-sm font-bold uppercase tracking-wider text-txt-muted">
              {g.name} <span className="ml-2 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-normal">{g.endpoints.length}</span>
            </span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-secondary/30 text-left font-semibold uppercase tracking-wider text-txt-muted">
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Path</th>
                  <th className="py-2 px-3">Auth</th>
                  <th className="py-2 px-3">Fungsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {g.endpoints.map(([method, path, auth, desc], i) => (
                  <tr key={i} className="hover:bg-surface-secondary/20">
                    <td className="py-1.5 px-3">
                      <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${methodColor(method)}`}>
                        {method}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-txt-primary">{path}</td>
                    <td className={`py-1.5 px-3 font-semibold ${authColor(auth)}`}>{auth}</td>
                    <td className="py-1.5 px-3 text-txt-secondary">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 13. COMPONENTS LIBRARY
// ════════════════════════════════════════════════════════════════

function ComponentsTab() {
  const groups = [
    {
      name: "Layout",
      path: "src/components/layout/",
      items: [
        ["Header.tsx", "Navigation header utama (public + panel common)"],
        ["PublicNav.tsx", "Top navbar halaman publik (kategori, search, login)"],
        ["Sidebar.tsx", "Sidebar panel admin dengan menu items"],
        ["Footer.tsx", "Footer panel admin"],
        ["PublicFooter.tsx", "Footer halaman publik (kontak, sosmed, link)"],
        ["TopLoader.tsx", "Progress bar loading di top saat navigate"],
        ["NewsTicker.tsx", "Breaking news ticker running di header"],
        ["TrendingTags.tsx", "Widget tags trending (homepage + sidebar)"],
        ["HorizontalScroll.tsx", "Container scroll horizontal (carousel basic)"],
        ["ScrollableContainer.tsx", "Wrapper scrollable dengan arrow button"],
        ["ZoomCompensator.tsx", "Fix mobile pinch-zoom issue"],
      ],
    },
    {
      name: "Artikel",
      path: "src/components/artikel/",
      items: [
        ["ArticleCard.tsx", "Card artikel preview (judul, gambar, meta) — reusable"],
        ["SearchableArticleList.tsx", "List artikel dengan search + filter client-side"],
        ["PaginatedArticles.tsx", "List artikel dengan pagination (load more / pages)"],
        ["CommentSection.tsx", "Section komentar artikel (form + list + threaded replies)"],
        ["ShareBar.tsx", "Tombol share WhatsApp, Facebook, Twitter, copy link"],
        ["BookmarkButton.tsx", "Toggle bookmark artikel (localStorage)"],
        ["PrintButton.tsx", "Trigger window.print() dengan print CSS"],
        ["ReadingProgress.tsx", "Progress bar baca artikel (scroll-based)"],
        ["CopyProtection.tsx", "Disable right-click + selectstart pada body artikel"],
      ],
    },
    {
      name: "Editor",
      path: "src/components/editor/",
      items: [
        ["RichTextEditor.tsx", "TipTap editor lengkap: bold, italic, heading, list, link, image, table, embed, AI tools"],
        ["ImageUploader.tsx", "Modal upload/pilih gambar dari library dengan crop"],
        ["ImageCropModal.tsx", "Modal crop gambar sebelum upload (aspect ratio lock)"],
      ],
    },
    {
      name: "Slider / Carousel",
      path: "src/components/slider/",
      items: [
        ["HeadlineSlider.tsx", "Hero slider full-width di homepage (auto-rotate)"],
        ["SubHeadlineSlider.tsx", "Sub-headline slider bawah hero (2nd tier)"],
        ["BreakingSlider.tsx", "Breaking news slider untuk artikel urgent"],
        ["PopularCarousel.tsx", "Carousel artikel populer (viewCount desc)"],
        ["PollingCarousel.tsx", "Carousel polling aktif"],
        ["VideoStory.tsx", "Carousel video story (Instagram-style)"],
      ],
    },
    {
      name: "UI & Feedback",
      path: "src/components/ui/",
      items: [
        ["Toast.tsx", "Toast notification (success, error, info) dengan Provider hook useToast"],
        ["ConfirmDialog.tsx", "Modal konfirmasi dengan variant (danger/warning/info) + hook useConfirm"],
      ],
    },
    {
      name: "Ads",
      path: "src/components/ads/",
      items: [
        ["BannerAd.tsx", "Komponen render banner iklan (impression tracking + slot-based)"],
      ],
    },
    {
      name: "Root",
      path: "src/components/",
      items: [
        ["Providers.tsx", "Bundle provider: SessionProvider, ToastProvider, ConfirmProvider"],
        ["ServiceWorkerRegistration.tsx", "Register PWA service worker (offline support)"],
        ["GoogleAnalytics.tsx", "Load GA4 tag di halaman publik"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>35+ komponen React</strong> terorganisir per feature. Semua pakai TypeScript + Tailwind.
          Komponen editor & carousel di-load lewat <code>dynamic()</code> untuk code-splitting.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.name} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">
              {g.name}
            </h3>
            <code className="text-xs text-txt-muted">{g.path}</code>
          </div>
          <div className="divide-y divide-border">
            {g.items.map(([file, desc]) => (
              <div key={file} className="flex items-start gap-3 px-6 py-2.5">
                <Component size={14} className="mt-0.5 flex-shrink-0 text-goto-green" />
                <div className="flex-1">
                  <code className="text-xs font-semibold text-txt-primary">{file}</code>
                  <p className="text-xs text-txt-secondary">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-[12px] border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">
            Lib Utilities <code className="text-xs normal-case font-normal">src/lib/</code>
          </h3>
        </div>
        <div className="divide-y divide-border">
          {[
            ["ai-client.ts", "Shared AI caller: callAI() — Anthropic Claude primary, DeepSeek fallback otomatis"],
            ["api-utils.ts", "Helper: requireAuth(), requireRole(), successResponse(), errorResponse(), ApiError class, audit logging"],
            ["auth.ts", "NextAuth config: credentials provider, JWT callback, session, canWriteArticles, canApproveArticles helpers"],
            ["prisma.ts", "Prisma client singleton (cached di global untuk hot-reload dev)"],
            ["roles.ts", "Role constants: EDITOR_ROLES, CREATOR_ROLES, ADMIN_ROLES, CAN_SUBMIT_REVIEW, roleLabelsMap"],
            ["utils.ts", "General: slugify(), calculateReadTime(), cn() (Tailwind class merge), toJakartaISO()"],
            ["sanitize.ts", "Sanitize HTML artikel — allowlist tags/attributes (mencegah XSS)"],
            ["article-status.ts", "State machine status artikel: canTransition(from, to, role)"],
            ["rate-limit.ts", "In-memory rate limiter per user/IP untuk API AI + submit"],
            ["seo-utils.ts", "Core SEO: onArticlePublished(), autoGenerateSeoFields(), autoGenerateFaq(), autoGenerateSorotan(), Cloudflare purge, Twitter share, IndexNow"],
            ["email.ts", "Resend wrapper — templates: articleApproved, articleRejected, articlePublished, articleInReview"],
            ["notifications.ts", "createNotification() — in-app notification untuk user"],
            ["export-utils.ts", "Export artikel ke PDF (jsPDF) atau TXT"],
            ["csv-utils.ts", "Parse & generate CSV (import/export data)"],
            ["video-data.ts", "Parse video embed URL (YouTube, TikTok) → metadata"],
            ["social/types.ts", "Type: Platform, PublishStatus, PublishResult, PreparedPost, ArticleForPublish"],
            ["social/instagram.ts", "InstagramPublisher class — Meta Graph API v21 (container → media_publish)"],
            ["social/facebook.ts", "FacebookPublisher class — link_share + photo post variants"],
            ["social/orchestrator.ts", "publishArticleToSocial() — coordinate multi-platform publish + approveDraft/rejectDraft/takedownPost"],
            ["social/caption-generator.ts", "generateSocialCaption() — AI gen caption + hashtag + CTA"],
            ["social/ai-caption.ts", "generateCaptionForTemplate() — AI gen paraphrased title + shortSummary"],
            ["social/template-renderer.ts", "renderTemplate() pakai Sharp — composite photo + text layers"],
            ["social/template-helper.ts", "findTemplateForPlatform() + renderAndStoreTemplate() + enrichArticleForTemplate()"],
          ].map(([file, desc]) => (
            <div key={file} className="flex items-start gap-3 px-6 py-2">
              <Code size={14} className="mt-0.5 flex-shrink-0 text-goto-green" />
              <div className="flex-1">
                <code className="text-xs font-semibold text-txt-primary">{file}</code>
                <p className="text-xs text-txt-secondary">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 14. DEPENDENCIES
// ════════════════════════════════════════════════════════════════

function DepsTab() {
  const categories = [
    {
      name: "Core Framework",
      items: [
        ["next", "14.2.0", "React framework dengan App Router, SSR, ISR"],
        ["react", "18.3.0", "UI library"],
        ["react-dom", "18.3.0", "DOM renderer"],
        ["typescript", "5.4", "Static type checker (devDep)"],
      ],
    },
    {
      name: "Database & ORM",
      items: [
        ["@prisma/client", "5.22", "Type-safe database client generated dari schema"],
        ["prisma", "5.22", "CLI untuk migrate & generate (devDep)"],
      ],
    },
    {
      name: "Auth & Security",
      items: [
        ["next-auth", "4.24", "Authentication layer — credentials provider, JWT session"],
        ["bcryptjs", "2.4", "Password hashing (12 rounds)"],
        ["sanitize-html", "2.17", "HTML sanitizer untuk konten artikel (XSS prevention)"],
        ["zod", "3.23", "Runtime validation schema untuk API input"],
      ],
    },
    {
      name: "Content Editor",
      items: [
        ["@tiptap/react", "3.20", "Rich text editor core (React wrapper)"],
        ["@tiptap/starter-kit", "3.20", "Bundle: Bold, Italic, Heading, Paragraph, List, dll"],
        ["@tiptap/extension-image", "3.20", "Inline image di editor"],
        ["@tiptap/extension-table", "3.20", "Table support"],
        ["@tiptap/extension-link", "3.20", "Link dengan preview"],
        ["@tiptap/extension-underline", "3.20", "Underline (bukan default HTML)"],
      ],
    },
    {
      name: "AI Providers",
      items: [
        ["@anthropic-ai/sdk", "0.90", "Claude API client (claude-haiku-4-5 — provider utama)"],
      ],
    },
    {
      name: "External APIs",
      items: [
        ["googleapis", "171.4", "Google APIs bundle — Search Console, Indexing, Analytics, Drive"],
        ["resend", "6.9", "Transactional email"],
      ],
    },
    {
      name: "Image Processing",
      items: [
        ["sharp", "0.34", "High-performance image processing (resize, compose, JPEG) — untuk template sosmed & optimasi"],
      ],
    },
    {
      name: "UI & Visualization",
      items: [
        ["lucide-react", "0.400", "Icon library (600+ icons) — dipakai di seluruh UI"],
        ["recharts", "3.8", "Chart library untuk dashboard statistik (line, bar, area, pie)"],
        ["tailwind-merge", "2.3", "Merge Tailwind classes dengan benar (handle konflik)"],
        ["clsx", "2.1", "Conditional classname helper"],
      ],
    },
    {
      name: "Export & Utilities",
      items: [
        ["jspdf", "4.2", "Generate PDF client-side (export artikel)"],
        ["date-fns", "3.6", "Date manipulation (format, parse, timezone — Jakarta ISO)"],
      ],
    },
    {
      name: "Styling",
      items: [
        ["tailwindcss", "3.4", "Utility-first CSS framework (devDep)"],
        ["postcss", "8.4", "CSS processor (devDep)"],
        ["autoprefixer", "10.4", "Auto vendor prefix (devDep)"],
      ],
    },
    {
      name: "Testing & Quality",
      items: [
        ["vitest", "1.6", "Unit test runner (devDep)"],
        ["eslint", "8.57", "Code linter (devDep)"],
        ["eslint-config-next", "14.2", "Next.js ESLint preset (devDep)"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>Stack dependency</strong> — total ~600 packages termasuk transitive deps.
          Lihat <code>package.json</code> + <code>package-lock.json</code> untuk versi exact.
          Untuk update: <code>npm outdated</code> lalu <code>npm update</code>.
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat.name} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">
              {cat.name}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-secondary/30 text-left font-semibold uppercase tracking-wider text-txt-muted">
                  <th className="py-2 px-4">Package</th>
                  <th className="py-2 px-4">Versi</th>
                  <th className="py-2 px-4">Fungsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cat.items.map(([pkg, ver, desc]) => (
                  <tr key={pkg}>
                    <td className="py-1.5 px-4"><code className="text-xs font-semibold text-txt-primary">{pkg}</code></td>
                    <td className="py-1.5 px-4 font-mono text-txt-muted">{ver}</td>
                    <td className="py-1.5 px-4 text-txt-secondary">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="rounded-[12px] border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
        <p className="font-semibold">⚠️ Catatan update:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Next.js 14.2 → jangan upgrade ke 15 tanpa testing menyeluruh (breaking changes App Router).</li>
          <li>Prisma 5.22 → stable, bisa upgrade ke 6 tapi perlu re-generate semua query types.</li>
          <li>TipTap 3.20 → breaking change dari v2, sudah di-handle di RichTextEditor.tsx.</li>
          <li>Sharp 0.34 → perlu rebuild native binding per architecture (x86_64 vs ARM). Otomatis via postinstall.</li>
          <li>Anthropic SDK 0.90 → API stable tapi model version boleh update (claude-haiku-4-5 ke haiku-5-xxx).</li>
        </ul>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 15. HALAMAN PUBLIK
// ════════════════════════════════════════════════════════════════

function PublikTab() {
  const groups = [
    {
      name: "Homepage & Discovery",
      pages: [
        ["/", "Homepage — hero slider, headline, breaking news, kategori, trending"],
        ["/search", "Global search artikel dengan filter + suggest"],
        ["/topik", "Daftar semua topik/kategori"],
        ["/topik/[slug]", "Detail topik — artikel + sub-kategori"],
        ["/bookmark", "Bookmark user (localStorage-based)"],
      ],
    },
    {
      name: "Artikel",
      pages: [
        ["/berita", "Semua artikel published (paginated)"],
        ["/berita/[slug]", "Detail artikel lengkap + komentar + share + related"],
        ["/kategori/[slug]", "Artikel per kategori (Pidana, Perdata, Tata Negara, dll)"],
        ["/tag/[slug]", "Artikel per tag"],
        ["/penulis/[slug]", "Profile penulis + daftar karya"],
      ],
    },
    {
      name: "Ringkasan & Sorotan",
      pages: [
        ["/sorotan", "List halaman Sorotan SEO (substantive summaries)"],
        ["/sorotan/[slug]", "Detail sorotan — 300-500 kata angle spesifik"],
        ["/rangkuman", "Halaman rangkuman umum"],
        ["/rangkuman/[slug]", "Rangkuman berdasarkan topik"],
        ["/rangkuman/harian", "Rangkuman berita harian"],
        ["/rangkuman/harian/[slug]", "Rangkuman per tanggal spesifik"],
      ],
    },
    {
      name: "Jadwal & Lokasi",
      pages: [
        ["/jadwal-sidang", "Jadwal sidang pengadilan (scheduled, live, done)"],
        ["/lokasi", "Direktori lokasi/pengadilan di Bandung"],
        ["/lokasi/[slug]", "Detail lokasi pengadilan"],
      ],
    },
    {
      name: "Informasi & Legal",
      pages: [
        ["/tentang", "Tentang Jurnalis Hukum Bandung"],
        ["/redaksi", "Tim redaksi (editor + jurnalis)"],
        ["/kode-etik", "Kode etik jurnalistik JHB"],
        ["/pedoman-media", "Pedoman media cyber"],
        ["/syarat-ketentuan", "Terms & conditions"],
        ["/privasi", "Privacy policy"],
        ["/iklan", "Info iklan & rate card"],
        ["/kontak", "Form kontak (public)"],
      ],
    },
    {
      name: "Auth & System",
      pages: [
        ["/login", "Login form (email + password)"],
        ["/offline", "Halaman fallback PWA offline"],
      ],
    },
    {
      name: "SEO Routes",
      pages: [
        ["/sitemap.xml", "Main sitemap (artikel published)"],
        ["/sitemap-news.xml", "News sitemap (2 hari terakhir, format Google News)"],
        ["/robots.txt", "Robots directive + sitemap refs"],
        ["/opengraph-image/route", "Dynamic OG image per artikel (dibuat on-demand)"],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p>
          <strong>29 halaman publik</strong> diorganisir per fungsi.
          Semua pakai Server Components (query Prisma langsung) untuk SEO-friendly + fast TTFB.
          Dynamic routes (<code>[slug]</code>) pakai <code>generateStaticParams</code> untuk ISR.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.name} className="rounded-[12px] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-6 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">{g.name}</h3>
          </div>
          <div className="divide-y divide-border">
            {g.pages.map(([path, desc]) => (
              <div key={path} className="flex items-start gap-3 px-6 py-2.5">
                <a
                  href={path.includes("[") ? "#" : path}
                  target={path.includes("[") ? undefined : "_blank"}
                  className="flex-shrink-0 rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  {path}
                </a>
                <p className="text-xs text-txt-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


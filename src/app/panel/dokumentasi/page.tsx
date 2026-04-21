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
} from "lucide-react";

type TabKey =
  | "struktur"
  | "workflow"
  | "fitur"
  | "integrasi"
  | "cron"
  | "database"
  | "trouble";

interface SettingsMap {
  [key: string]: string;
}

export default function DokumentasiPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("struktur");
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

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
    { key: "cron", label: "Cron Jobs", icon: Clock },
    { key: "database", label: "Database & Halaman", icon: Database },
    { key: "trouble", label: "Troubleshooting", icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-goto-light">
            <BookOpen size={24} className="text-goto-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">Dokumen Master JHB</h1>
            <p className="text-sm text-txt-secondary">
              Ringkasan lengkap struktur, fitur, integrasi, dan alur kerja sistem
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
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
      {activeTab === "struktur" && <StrukturTab />}
      {activeTab === "workflow" && <WorkflowTab />}
      {activeTab === "fitur" && <FiturTab settings={settings} has={has} loading={loading} />}
      {activeTab === "integrasi" && <IntegrasiTab settings={settings} has={has} loading={loading} />}
      {activeTab === "cron" && <CronTab />}
      {activeTab === "database" && <DatabaseTab />}
      {activeTab === "trouble" && <TroubleTab />}
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
  const models = [
    { name: "Article", desc: "Artikel berita — konten utama" },
    { name: "Category", desc: "Kategori artikel (Pidana, Perdata, Tata Negara, dll)" },
    { name: "Tag", desc: "Tag untuk pengelompokan + SEO keyword" },
    { name: "User", desc: "Akun user (SUPER_ADMIN, EDITOR, JOURNALIST, CONTRIBUTOR)" },
    { name: "Comment", desc: "Komentar publik dengan moderasi" },
    { name: "Poll + PollOption + PollVote", desc: "Sistem polling per artikel" },
    { name: "Sorotan", desc: "Halaman substantif SEO (3 per artikel, beda angle)" },
    { name: "Ad + AdImpression", desc: "Sistem iklan + tracking view/click" },
    { name: "SocialPost", desc: "Record post ke IG/FB — status, externalUrl, image" },
    { name: "SocialTemplate", desc: "Template gambar untuk render sosmed" },
    { name: "Notification", desc: "In-panel notification untuk user" },
    { name: "AuditLog", desc: "Record semua aksi sensitif (publish, delete, approve)" },
    { name: "AIUsageLog", desc: "Track pemakaian token AI per fitur" },
    { name: "SystemSetting", desc: "Key-value store untuk settings (API keys, toggles)" },
    { name: "TargetKeyword", desc: "Keyword SEO yang di-target untuk auto-artikel" },
    { name: "CourtSchedule", desc: "Jadwal sidang pengadilan (kalau fitur aktif)" },
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
      <div className="rounded-[12px] border border-border bg-surface shadow-card">
        <div className="border-b border-border px-6 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-txt-muted">Model Database Utama</h3>
          <p className="mt-1 text-xs text-txt-secondary">
            Lihat definisi lengkap di <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-xs">prisma/schema.prisma</code>
          </p>
        </div>
        <div className="grid gap-0 md:grid-cols-2">
          {models.map((m) => (
            <div key={m.name} className="border-b border-border px-6 py-2.5 md:border-r last:md:border-r-0">
              <p className="text-sm font-semibold text-txt-primary">{m.name}</p>
              <p className="text-xs text-txt-secondary">{m.desc}</p>
            </div>
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
// 7. TROUBLESHOOTING
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

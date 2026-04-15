"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Settings, Save, CheckCircle, Bot, Eye, EyeOff, Globe, Zap, RefreshCw, AlertCircle, Check } from "lucide-react";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  emailRedaksi: string;
  alamatRedaksi: string;
  websiteUrl: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  articlesPerPage: number;
  enableComments: boolean;
  autoModerateComments: boolean;
}

const defaultSettings: SiteSettings = {
  siteName: "Jurnalis Hukum Bandung",
  siteDescription:
    "Portal berita hukum terpercaya di Bandung. Menyajikan berita hukum pidana, perdata, tata negara, HAM, dan analisis hukum yang akurat dan terverifikasi.",
  emailRedaksi: "redaksi@jurnalishukumbandung.com",
  alamatRedaksi: "Bandung, Jawa Barat, Indonesia",
  websiteUrl: "jurnalishukumbandung.com",
  metaTitle: "Jurnalis Hukum Bandung - Media Hukum Digital Terpercaya",
  metaDescription:
    "Portal berita hukum terpercaya di Bandung. Menyajikan berita hukum pidana, perdata, tata negara, HAM, dan analisis hukum yang akurat dan terverifikasi.",
  keywords:
    "berita hukum, hukum bandung, jurnalis hukum, berita hukum bandung, hukum pidana, hukum perdata",
  articlesPerPage: 12,
  enableComments: true,
  autoModerateComments: false,
};

const STORAGE_KEY = "jhb_site_settings";

export default function PengaturanPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role || "";

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [toast, setToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Pengaturan berhasil disimpan");
  const [loaded, setLoaded] = useState(false);

  // AI settings state
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  // Google SEO Automation state
  const [googleCredentials, setGoogleCredentials] = useState("");
  const [googleCredentialsVisible, setGoogleCredentialsVisible] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const [googleSaving, setGoogleSaving] = useState(false);
  const [googleTesting, setGoogleTesting] = useState(false);
  const [googleTestResult, setGoogleTestResult] = useState<{
    valid: boolean;
    email?: string;
    indexingApi: boolean;
    searchConsole: boolean;
    error?: string;
  } | null>(null);
  const [seoPinging, setSeoPinging] = useState(false);
  const [seoPingResult, setSeoPingResult] = useState<string | null>(null);

  // Redirect non-super-admin
  if (sessionStatus !== "loading" && session && userRole !== "SUPER_ADMIN") {
    redirect("/panel/dashboard");
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {
      // Ignore parse errors
    }
    setLoaded(true);

    // Load settings from server (AI key + contact info + Google credentials)
    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data) {
          const d = json.data;
          if (d.deepseek_api_key) setAiApiKey(d.deepseek_api_key);
          if (d.google_credentials_json) setGoogleCredentials(d.google_credentials_json);
          if (d.google_indexing_enabled !== undefined) setGoogleEnabled(d.google_indexing_enabled === "true");
          setSettings((prev) => ({
            ...prev,
            ...(d.contact_email && { emailRedaksi: d.contact_email }),
            ...(d.alamat_redaksi && { alamatRedaksi: d.alamat_redaksi }),
            ...(d.website_url && { websiteUrl: d.website_url }),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleSave = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    // Also save contact info to database so public pages can read it
    const dbSettings = [
      { key: "contact_email", value: settings.emailRedaksi },
      { key: "alamat_redaksi", value: settings.alamatRedaksi },
      { key: "website_url", value: settings.websiteUrl },
    ];
    try {
      await Promise.all(
        dbSettings.map((s) =>
          fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s),
          })
        )
      );
      showToast("Pengaturan berhasil disimpan");
    } catch {
      showToast("Tersimpan lokal, gagal sinkron ke server");
    }
  };

  const handleSaveAiKey = async () => {
    setAiSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "deepseek_api_key", value: aiApiKey }),
      });
      if (res.ok) {
        showToast("API Key berhasil disimpan");
      } else {
        showToast("Gagal menyimpan API Key");
      }
    } catch {
      showToast("Gagal menyimpan API Key");
    } finally {
      setAiSaving(false);
    }
  };

  const handleTestGoogleCredentials = async () => {
    setGoogleTesting(true);
    setGoogleTestResult(null);
    try {
      const res = await fetch("/api/seo/test-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialsJson: googleCredentials }),
      });
      const json = await res.json();
      if (json?.data) {
        setGoogleTestResult(json.data);
      } else {
        setGoogleTestResult({ valid: false, indexingApi: false, searchConsole: false, error: "Gagal memverifikasi" });
      }
    } catch {
      setGoogleTestResult({ valid: false, indexingApi: false, searchConsole: false, error: "Gagal menghubungi server" });
    } finally {
      setGoogleTesting(false);
    }
  };

  const handleSaveGoogleCredentials = async () => {
    setGoogleSaving(true);
    try {
      // Save credentials
      const res1 = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_credentials_json", value: googleCredentials }),
      });
      // Save enabled state
      const res2 = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "google_indexing_enabled", value: googleEnabled ? "true" : "false" }),
      });
      if (res1.ok && res2.ok) {
        showToast("Google Credentials berhasil disimpan");
      } else {
        showToast("Gagal menyimpan credentials");
      }
    } catch {
      showToast("Gagal menyimpan credentials");
    } finally {
      setGoogleSaving(false);
    }
  };

  const handleManualSeoPing = async () => {
    setSeoPinging(true);
    setSeoPingResult(null);
    try {
      const res = await fetch("/api/seo/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json?.data) {
        setSeoPingResult("Sitemap berhasil di-submit ke Google & Bing!");
      } else {
        setSeoPingResult("Gagal mengirim ping");
      }
    } catch {
      setSeoPingResult("Gagal menghubungi server");
    } finally {
      setSeoPinging(false);
    }
  };

  const updateField = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (sessionStatus === "loading" || !loaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Toast — animated slide-in */}
      {toast && (
        <div className="fixed right-4 top-20 z-50 animate-fade-up">
          <div className="flex items-center gap-3 rounded-[12px] border border-goto-green/30 bg-goto-green px-6 py-4 shadow-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <CheckCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{toastMessage}</p>
              <p className="text-xs text-white/70 mt-0.5">Perubahan telah tersimpan</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Settings size={24} className="text-goto-green" />
          <h1 className="text-xl sm:text-3xl font-bold text-txt-primary">
            Pengaturan Sistem
          </h1>
        </div>
        <p className="mt-1 text-base text-txt-secondary">
          Kelola konfigurasi umum website
        </p>
      </div>

      <div className="space-y-6">
        {/* Informasi Website */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-txt-primary">
            Informasi Website
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Nama Website
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => updateField("siteName", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Deskripsi
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) =>
                  updateField("siteDescription", e.target.value)
                }
                rows={3}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Email Redaksi
              </label>
              <input
                type="email"
                value={settings.emailRedaksi}
                onChange={(e) => updateField("emailRedaksi", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Alamat Redaksi
              </label>
              <textarea
                value={settings.alamatRedaksi}
                onChange={(e) =>
                  updateField("alamatRedaksi", e.target.value)
                }
                rows={2}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Website URL
              </label>
              <input
                type="text"
                value={settings.websiteUrl}
                onChange={(e) => updateField("websiteUrl", e.target.value)}
                className="input"
                placeholder="contoh: jurnalishukumbandung.com"
              />
            </div>
          </div>
        </div>

        {/* SEO Default */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-txt-primary">
            SEO Default
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Meta Title
              </label>
              <input
                type="text"
                value={settings.metaTitle}
                onChange={(e) => updateField("metaTitle", e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Meta Description
              </label>
              <textarea
                value={settings.metaDescription}
                onChange={(e) =>
                  updateField("metaDescription", e.target.value)
                }
                rows={3}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Keywords
              </label>
              <input
                type="text"
                value={settings.keywords}
                onChange={(e) => updateField("keywords", e.target.value)}
                className="input"
                placeholder="Pisahkan dengan koma"
              />
            </div>
          </div>
        </div>

        {/* Pengaturan Konten */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-txt-primary">
            Pengaturan Konten
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Jumlah artikel per halaman
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.articlesPerPage}
                onChange={(e) =>
                  updateField(
                    "articlesPerPage",
                    parseInt(e.target.value) || 12
                  )
                }
                className="input w-full sm:w-32"
              />
            </div>
            <div className="flex items-center justify-between rounded-[12px] border border-border bg-surface-secondary px-4 py-3">
              <div>
                <p className="text-base font-medium text-txt-primary">
                  Aktifkan komentar
                </p>
                <p className="text-sm text-txt-muted">
                  Izinkan pembaca meninggalkan komentar pada artikel
                </p>
              </div>
              <button
                role="switch"
                aria-checked={settings.enableComments}
                onClick={() =>
                  updateField("enableComments", !settings.enableComments)
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  settings.enableComments ? "bg-goto-green" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.enableComments
                      ? "translate-x-[22px]"
                      : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-[12px] border border-border bg-surface-secondary px-4 py-3">
              <div>
                <p className="text-base font-medium text-txt-primary">
                  Moderasi komentar otomatis
                </p>
                <p className="text-sm text-txt-muted">
                  Komentar harus disetujui sebelum ditampilkan
                </p>
              </div>
              <button
                role="switch"
                aria-checked={settings.autoModerateComments}
                onClick={() =>
                  updateField(
                    "autoModerateComments",
                    !settings.autoModerateComments
                  )
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  settings.autoModerateComments ? "bg-goto-green" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoModerateComments
                      ? "translate-x-[22px]"
                      : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Konfigurasi AI */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={20} className="text-goto-green" />
            <h2 className="text-lg font-semibold text-txt-primary">
              Konfigurasi AI
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                DeepSeek API Key
              </label>
              <div className="relative">
                <input
                  type={aiKeyVisible ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  className="input pr-10"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setAiKeyVisible(!aiKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary"
                >
                  {aiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1 text-sm text-txt-muted">
                Dapatkan API key dari{" "}
                <a
                  href="https://platform.deepseek.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  platform.deepseek.com
                </a>
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveAiKey}
                disabled={aiSaving}
                className="btn-primary"
              >
                <Save size={16} />
                {aiSaving ? "Menyimpan..." : "Simpan API Key"}
              </button>
            </div>
          </div>
        </div>
        {/* Google SEO Automation */}
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Globe size={20} className="text-goto-green" />
            <h2 className="text-lg font-semibold text-txt-primary">
              Google SEO Automation
            </h2>
          </div>
          <p className="mb-4 text-sm text-txt-secondary leading-relaxed">
            Otomatisasi indexing ke Google. Setiap artikel yang dipublish akan langsung di-submit ke Google Indexing API
            (terindex dalam hitungan <strong>menit</strong>) dan sitemap otomatis di-submit ke Google Search Console.
          </p>

          <div className="space-y-4">
            {/* Enable/Disable toggle */}
            <div className="flex items-center justify-between rounded-[12px] border border-border bg-surface-secondary px-4 py-3">
              <div>
                <p className="text-base font-medium text-txt-primary">
                  Aktifkan Google Indexing
                </p>
                <p className="text-sm text-txt-muted">
                  Auto-submit artikel baru ke Google Indexing API & Search Console
                </p>
              </div>
              <button
                role="switch"
                aria-checked={googleEnabled}
                onClick={() => setGoogleEnabled(!googleEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                  googleEnabled ? "bg-goto-green" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    googleEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </button>
            </div>

            {/* Google Service Account JSON */}
            <div>
              <label className="mb-1.5 block text-base font-medium text-txt-primary">
                Google Service Account Credentials (JSON)
              </label>
              <div className="relative">
                <textarea
                  value={googleCredentialsVisible ? googleCredentials : (googleCredentials ? "••••••••••••••••••••••••" : "")}
                  onChange={(e) => {
                    if (!googleCredentialsVisible) {
                      setGoogleCredentialsVisible(true);
                    }
                    setGoogleCredentials(e.target.value);
                  }}
                  onFocus={() => {
                    if (!googleCredentialsVisible && googleCredentials) {
                      setGoogleCredentialsVisible(true);
                    }
                  }}
                  rows={6}
                  className="input resize-none font-mono text-xs"
                  placeholder='{"type": "service_account", "client_email": "...", "private_key": "...", ...}'
                />
                <button
                  type="button"
                  onClick={() => setGoogleCredentialsVisible(!googleCredentialsVisible)}
                  className="absolute right-3 top-3 text-txt-muted hover:text-txt-primary"
                >
                  {googleCredentialsVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1.5 text-sm text-txt-muted leading-relaxed">
                Cara mendapatkan:
              </p>
              <ol className="mt-1 ml-4 text-sm text-txt-muted list-decimal space-y-0.5">
                <li>Buka <strong>Google Cloud Console</strong> &rarr; APIs &amp; Services &rarr; Credentials</li>
                <li>Buat <strong>Service Account</strong> baru</li>
                <li>Enable <strong>Web Search Indexing API</strong> dan <strong>Google Search Console API</strong></li>
                <li>Download JSON key dari service account</li>
                <li>Di <strong>Google Search Console</strong> &rarr; Settings &rarr; Users &rarr; tambahkan email service account sebagai <strong>Owner</strong></li>
                <li>Paste isi file JSON di atas</li>
              </ol>
            </div>

            {/* Test Credentials */}
            {googleTestResult && (
              <div className={`rounded-[12px] border p-4 ${googleTestResult.valid ? "border-goto-green/30 bg-goto-light" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {googleTestResult.valid ? (
                    <Check size={18} className="text-goto-green" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                  <span className={`text-sm font-semibold ${googleTestResult.valid ? "text-goto-green" : "text-red-600"}`}>
                    {googleTestResult.valid ? "Credentials Valid" : "Credentials Invalid"}
                  </span>
                </div>
                {googleTestResult.email && (
                  <p className="text-sm text-txt-secondary">Service Account: <strong>{googleTestResult.email}</strong></p>
                )}
                <div className="mt-2 flex gap-4 text-sm">
                  <span className={googleTestResult.indexingApi ? "text-goto-green" : "text-txt-muted"}>
                    {googleTestResult.indexingApi ? "✓" : "✗"} Indexing API
                  </span>
                  <span className={googleTestResult.searchConsole ? "text-goto-green" : "text-txt-muted"}>
                    {googleTestResult.searchConsole ? "✓" : "✗"} Search Console API
                  </span>
                </div>
                {googleTestResult.error && (
                  <p className="mt-1 text-sm text-red-500">{googleTestResult.error}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleTestGoogleCredentials}
                disabled={googleTesting || !googleCredentials}
                className="btn-secondary text-sm"
              >
                <Zap size={14} />
                {googleTesting ? "Menguji..." : "Test Credentials"}
              </button>
              <button
                onClick={handleSaveGoogleCredentials}
                disabled={googleSaving}
                className="btn-primary text-sm"
              >
                <Save size={14} />
                {googleSaving ? "Menyimpan..." : "Simpan Credentials"}
              </button>
            </div>

            {/* Manual SEO Ping */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-medium text-txt-primary">Manual SEO Ping</p>
                  <p className="text-sm text-txt-muted">
                    Submit ulang sitemap ke Google Search Console, ping Google &amp; Bing
                  </p>
                </div>
                <button
                  onClick={handleManualSeoPing}
                  disabled={seoPinging}
                  className="btn-secondary text-sm"
                >
                  <RefreshCw size={14} className={seoPinging ? "animate-spin" : ""} />
                  {seoPinging ? "Mengirim..." : "Ping Sekarang"}
                </button>
              </div>
              {seoPingResult && (
                <p className="mt-2 text-sm text-goto-green font-medium">{seoPingResult}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} className="btn-primary">
          <Save size={16} />
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}

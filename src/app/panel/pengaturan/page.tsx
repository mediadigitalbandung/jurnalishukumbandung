"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Settings, Save, CheckCircle, Bot, Eye, EyeOff } from "lucide-react";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  emailRedaksi: string;
  alamatRedaksi: string;
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
  emailRedaksi: "redaksi@jurnalishukumbandung.id",
  alamatRedaksi: "Jl. Bandung, Jawa Barat, Indonesia",
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

  // Redirect non-super-admin
  if (sessionStatus !== "loading" && session && userRole !== "SUPER_ADMIN") {
    redirect("/panel/dashboard");
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {
      // Ignore parse errors
    }
    setLoaded(true);

    // Load AI API key from server
    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (json?.data?.deepseek_api_key) {
          setAiApiKey(json.data.deepseek_api_key);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    showToast("Pengaturan berhasil disimpan");
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

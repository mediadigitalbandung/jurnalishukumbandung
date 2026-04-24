"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
  Save,
  Video,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

interface TiktokSettingsData {
  enabled: boolean;
  clientKey: string | null;
  clientSecretLength: number;
  clientSecretPreview: string | null;
  clientKeyValid: boolean;
  clientSecretValid: boolean;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt: string | null;
  openId: string | null;
  username: string | null;
  maxDurationSec: number;
  outputWidth: number;
  outputHeight: number;
  outputFps: number;
  autoPublishEnabled: boolean;
  draftModeEnabled: boolean;
  aiCaptionEnabled: boolean;
  aiHashtagEnabled: boolean;
  defaultHashtags: string[];
  updatedAt?: string;
}

export default function TiktokSettingsPage() {
  const { success, error: showError } = useToast();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<TiktokSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [newClientKey, setNewClientKey] = useState("");
  const [newClientSecret, setNewClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showClientKey, setShowClientKey] = useState(true);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => success(`${label} di-copy`));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tiktok/settings");
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const success1 = searchParams?.get("tiktok_success");
    const errMsg = searchParams?.get("tiktok_error");
    if (success1) success("TikTok terhubung!");
    if (errMsg) showError(`TikTok OAuth error: ${errMsg}`);
  }, [load, searchParams, success, showError]);

  const saveCredentials = async () => {
    if (!newClientKey.trim() || !newClientSecret.trim()) {
      showError("Client key & secret wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tiktok/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientKey: newClientKey.trim(),
          clientSecret: newClientSecret.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        success("Credentials tersimpan");
        setNewClientKey("");
        setNewClientSecret("");
        load();
      } else {
        showError(json.error || "Gagal simpan");
      }
    } catch {
      showError("Gagal simpan");
    }
    setSaving(false);
  };

  const saveField = async (field: string, value: unknown) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tiktok/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        load();
      } else {
        showError(json.error || "Gagal simpan");
      }
    } catch {
      showError("Gagal simpan");
    }
    setSaving(false);
  };

  const connectTikTok = async (mode?: "minimal") => {
    setConnecting(true);
    try {
      const url = mode === "minimal" ? "/api/tiktok/auth?mode=minimal" : "/api/tiktok/auth";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        window.location.href = json.data.authUrl;
      } else {
        showError(json.error || "Gagal memulai OAuth");
        setConnecting(false);
      }
    } catch {
      showError("Error");
      setConnecting(false);
    }
  };

  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const debugOAuth = async (mode?: "minimal") => {
    try {
      const url = mode === "minimal" ? "/api/tiktok/auth?mode=minimal" : "/api/tiktok/auth";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setDebugUrl(json.data.authUrl);
      } else {
        showError(json.error || "Gagal generate URL");
      }
    } catch {
      showError("Error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-pink-600" />
      </div>
    );
  }
  if (!settings) return null;

  const isConnected = settings.hasAccessToken && !!settings.openId;
  const tokenExpired = settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/panel/tiktok" className="mb-2 inline-flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary">
        <ArrowLeft size={12} /> Kembali ke TikTok
      </Link>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-txt-primary">
        <SettingsIcon size={24} className="text-pink-600" />
        Pengaturan TikTok
      </h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Konfigurasi integrasi TikTok Content Posting API + preferensi render.
      </p>

      {/* Master switch */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-txt-primary">Aktifkan Integrasi TikTok</h2>
            <p className="text-xs text-txt-secondary">Master switch untuk fitur publish ke TikTok</p>
          </div>
          <button
            onClick={() => saveField("enabled", !settings.enabled)}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings.enabled ? "bg-pink-600" : "bg-gray-200"}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${settings.enabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {/* Step 1: Credentials */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          <Key size={14} /> Langkah 1: App Credentials
        </h2>
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <p className="flex items-start gap-1">
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
            <span>
              Daftar app di{" "}
              <a href="https://developers.tiktok.com/apps/" target="_blank" rel="noreferrer" className="underline font-semibold">
                developers.tiktok.com
              </a>
              . Pilih <strong>Content Posting API</strong>, add redirect URL:{" "}
              <code className="rounded bg-white px-1 py-0.5">{typeof window !== "undefined" ? window.location.origin : ""}/api/tiktok/auth/callback</code>
            </span>
          </p>
        </div>

        {settings.clientKey && settings.hasClientSecret ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface-secondary p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-semibold text-goto-green">
                <CheckCircle size={16} /> Credentials terpasang
              </p>
              {settings.updatedAt && (
                <span className="text-xs text-txt-muted">
                  Update: {new Date(settings.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </div>

            {/* Client Key — full display */}
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-txt-secondary">
                <span className="flex items-center gap-1.5">
                  Client Key
                  {settings.clientKeyValid ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-goto-light px-1.5 py-0.5 text-[10px] font-bold text-goto-green">
                      <CheckCircle size={10} /> VALID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      <XCircle size={10} /> FORMAT SALAH
                    </span>
                  )}
                  <span className="text-[10px] text-txt-muted">{settings.clientKey.length} chars</span>
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowClientKey(!showClientKey)} className="text-txt-muted hover:text-txt-primary" title={showClientKey ? "Hide" : "Show"}>
                    {showClientKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => copyToClipboard(settings.clientKey || "", "Client Key")} className="text-txt-muted hover:text-txt-primary" title="Copy">
                    <Copy size={14} />
                  </button>
                </div>
              </label>
              <code className="mt-1 block break-all rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-txt-primary">
                {showClientKey ? settings.clientKey : "•".repeat(settings.clientKey.length)}
              </code>
            </div>

            {/* Client Secret — masked with toggle */}
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-txt-secondary">
                <span className="flex items-center gap-1.5">
                  Client Secret
                  {settings.clientSecretValid ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-goto-light px-1.5 py-0.5 text-[10px] font-bold text-goto-green">
                      <CheckCircle size={10} /> VALID
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      <XCircle size={10} /> FORMAT SALAH
                    </span>
                  )}
                  <span className="text-[10px] text-txt-muted">{settings.clientSecretLength} chars</span>
                </span>
              </label>
              <code className="mt-1 block break-all rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-txt-primary">
                {settings.clientSecretPreview || "•••••"}
                <span className="ml-2 text-[10px] text-txt-muted">(masked — preview saja)</span>
              </code>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2">
              <p className="text-xs text-txt-muted">
                ✓ Client Key terlihat di atas — pastikan match dengan yang di TikTok Developer Portal
              </p>
              <button
                onClick={() => saveField("clientKey", null).then(() => saveField("clientSecret", null))}
                className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-txt-secondary">Client Key</label>
              <input type="text" value={newClientKey} onChange={(e) => setNewClientKey(e.target.value)} className="input mt-1 w-full text-sm" placeholder="awxxxxxxxxxxxxxxx" />
            </div>
            <div>
              <label className="text-xs text-txt-secondary">Client Secret</label>
              <input type="password" value={newClientSecret} onChange={(e) => setNewClientSecret(e.target.value)} className="input mt-1 w-full text-sm" placeholder="••••••••••••••••••••••••••••••••" />
            </div>
            <button onClick={saveCredentials} disabled={saving} className="inline-flex items-center gap-1 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Credentials
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Connect account */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-txt-muted">Langkah 2: Connect TikTok Account</h2>
        {isConnected ? (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            <p className="flex items-center gap-1 font-semibold text-green-800">
              <CheckCircle size={14} /> Terhubung dengan @{settings.username || "unknown"}
            </p>
            <p className="mt-1 text-xs text-green-700">
              Open ID: <code>{settings.openId?.slice(0, 12)}...</code>
            </p>
            {tokenExpired ? (
              <p className="mt-1 text-xs text-yellow-700">⚠️ Token expired — akan auto-refresh pada request berikutnya (butuh refresh token valid)</p>
            ) : (
              <p className="mt-1 text-xs text-green-600">
                Token valid sampai: {settings.tokenExpiresAt ? new Date(settings.tokenExpiresAt).toLocaleString("id-ID") : "—"}
              </p>
            )}
            <button onClick={() => connectTikTok()} disabled={connecting} className="mt-2 text-xs text-pink-600 hover:underline">
              {connecting ? "Mengarahkan..." : "Reconnect"}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm text-txt-secondary">
              Klik untuk login ke TikTok dan grant akses. Scope yang diminta: user.info.basic, video.upload, video.publish.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => connectTikTok()}
                disabled={connecting || !settings.clientKey}
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Connect TikTok (Full Scopes)
              </button>
              <button
                onClick={() => connectTikTok("minimal")}
                disabled={connecting || !settings.clientKey}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary px-3 py-2 text-xs font-medium text-txt-secondary hover:border-goto-green hover:text-goto-green disabled:opacity-50"
                title="Test dengan scope user.info.basic saja — untuk isolate issue kalau full scope fail"
              >
                🔬 Test Minimal Scope
              </button>
            </div>
            <p className="mt-2 text-xs text-txt-muted">
              💡 <strong>Tips debug:</strong> Kalau &quot;Full Scopes&quot; error <code>client_key</code>, coba &quot;Test Minimal Scope&quot; dulu —
              kalau berhasil, berarti scope <code>video.upload</code> / <code>video.publish</code> belum ditambah di TikTok Dev Portal.
            </p>

            <div className="mt-3 border-t border-border pt-3">
              <button
                onClick={() => debugOAuth("minimal")}
                className="text-xs text-txt-secondary underline hover:text-goto-green"
              >
                🔍 Show OAuth URL (diagnostic)
              </button>
              {debugUrl && (
                <div className="mt-2 rounded border border-yellow-300 bg-yellow-50 p-3">
                  <p className="text-xs font-semibold text-yellow-900">URL yang dikirim ke TikTok:</p>
                  <textarea
                    readOnly
                    value={debugUrl}
                    className="mt-1 w-full rounded border border-yellow-200 bg-white p-2 font-mono text-[10px] text-txt-primary"
                    rows={4}
                  />
                  <p className="mt-1 text-[10px] text-yellow-800">
                    Verify: (a) <code>client_key</code> match dengan TikTok portal, (b) <code>redirect_uri</code> decoded = <code>https://jurnalishukumbandung.com/api/tiktok/auth/callback</code>
                  </p>
                </div>
              )}
            </div>

            {!settings.clientKey && <p className="mt-1 text-xs text-red-500">Simpan credentials dulu (Langkah 1)</p>}
          </div>
        )}
      </div>

      {/* Output specs */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          <Video size={14} /> Spesifikasi Render
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <label className="text-xs text-txt-secondary">Max durasi (detik)</label>
            <input type="number" min={3} max={180} value={settings.maxDurationSec} onChange={(e) => setSettings({ ...settings, maxDurationSec: parseInt(e.target.value) })} onBlur={(e) => saveField("maxDurationSec", parseInt(e.target.value))} className="input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs text-txt-secondary">Width (px)</label>
            <input type="number" value={settings.outputWidth} onChange={(e) => setSettings({ ...settings, outputWidth: parseInt(e.target.value) })} onBlur={(e) => saveField("outputWidth", parseInt(e.target.value))} className="input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs text-txt-secondary">Height (px)</label>
            <input type="number" value={settings.outputHeight} onChange={(e) => setSettings({ ...settings, outputHeight: parseInt(e.target.value) })} onBlur={(e) => saveField("outputHeight", parseInt(e.target.value))} className="input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs text-txt-secondary">FPS</label>
            <input type="number" min={24} max={60} value={settings.outputFps} onChange={(e) => setSettings({ ...settings, outputFps: parseInt(e.target.value) })} onBlur={(e) => saveField("outputFps", parseInt(e.target.value))} className="input mt-1 w-full" />
          </div>
        </div>
        <p className="mt-2 text-xs text-txt-muted">Default: 1080×1920 (9:16), 30fps, 60s — optimal untuk TikTok vertikal.</p>
      </div>

      {/* Publish behavior */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-txt-muted">Behavior Publish</h2>
        <div className="space-y-3 text-sm">
          <Toggle label="Draft mode (upload ke inbox TikTok, finalize manual di app)" value={settings.draftModeEnabled} onChange={(v) => saveField("draftModeEnabled", v)} />
          <Toggle label="Auto-publish setelah render" value={settings.autoPublishEnabled} onChange={(v) => saveField("autoPublishEnabled", v)} />
          <Toggle label="Auto-generate caption via AI" value={settings.aiCaptionEnabled} onChange={(v) => saveField("aiCaptionEnabled", v)} />
          <Toggle label="Auto-generate hashtag via AI" value={settings.aiHashtagEnabled} onChange={(v) => saveField("aiHashtagEnabled", v)} />
        </div>
      </div>

      {/* Default hashtags */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-txt-muted">Default Hashtag</h2>
        <p className="mb-2 text-xs text-txt-secondary">Hashtag yang selalu ditambahkan (pisah koma)</p>
        <input
          type="text"
          defaultValue={settings.defaultHashtags.join(", ")}
          onBlur={(e) => {
            const tags = e.target.value.split(/[,\s]+/).map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter((t) => t.length >= 2 && t.length <= 30).slice(0, 10);
            saveField("defaultHashtags", tags);
          }}
          placeholder="jurnalishukumbandung, fyp, bandung"
          className="input w-full text-sm"
        />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-txt-primary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${value ? "bg-pink-600" : "bg-gray-200"}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

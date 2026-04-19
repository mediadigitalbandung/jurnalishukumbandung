"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import {
  Share2, Instagram, Facebook, Settings, CheckCircle, XCircle, Clock,
  Save, Loader2, ExternalLink, RefreshCw, AlertCircle, Plus, X, Send, Layout, Edit3, Trash2, Star, Eye,
} from "lucide-react";
import TemplateEditor, { type TemplateData } from "./_components/TemplateEditor";

type GlobalSettings = {
  autoPublishEnabled: boolean;
  draftModeEnabled: boolean;
  metaAccessToken: string | null;
  fbPageId: string | null;
  fbPageName: string | null;
  igUserId: string | null;
  igAccountName: string | null;
  metaTokenExpiresAt: string | null;
  captionPromptTemplate: string | null;
  captionSafetyRules: string | null;
  fixedHashtagsBrand: string[];
  notificationEmail: string | null;
};

type IgSettings = {
  enabled: boolean;
  aspectRatio: string;
  jpegQuality: number;
  watermarkPngUrl: string | null;
  hashtagCountTarget: number;
  fixedHashtagsIg: string[];
  captionToneOverride: string | null;
  publishDelaySec: number;
};

type FbSettings = {
  enabled: boolean;
  defaultPostFormat: string;
  aspectRatio: string;
  jpegQuality: number;
  hashtagCountTarget: number;
  fixedHashtagsFb: string[];
  captionToneOverride: string | null;
  publishDelaySec: number;
  linkPosition: string;
};

type SocialPost = {
  id: string;
  articleId: string;
  platform: string;
  status: string;
  externalPostId: string | null;
  externalUrl: string | null;
  postFormat: string | null;
  captionFinal: string | null;
  renderedImageUrl: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  article: { title: string; slug: string };
};

type Stats = {
  instagram: { success: number; failed: number; draft: number };
  facebook: { success: number; failed: number; draft: number };
};

export default function SocialMediaPanel() {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<"global" | "instagram" | "facebook" | "templates" | "logs">("global");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [global, setGlobal] = useState<GlobalSettings | null>(null);
  const [ig, setIg] = useState<IgSettings | null>(null);
  const [fb, setFb] = useState<FbSettings | null>(null);
  const [testing, setTesting] = useState(false);

  const testPublish = async () => {
    if (!confirm("Trigger test publish ke FB + IG dengan artikel terbaru? Post akan muncul di FB Page dan Instagram.")) return;
    setTesting(true);
    try {
      const res = await fetch("/api/social/test-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      const summary = (data.data?.summary || []).join("\n");
      success(`Test complete:\n${summary}`);
      setActiveTab("logs");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  // Templates state
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/social/templates");
      const data = await res.json();
      if (data.success) setTemplates(data.data.templates || []);
    } catch { /* ignore */ }
    setTemplatesLoading(false);
  }, []);

  const saveTemplate = async (tpl: TemplateData) => {
    const method = tpl.id ? "PUT" : "POST";
    const url = tpl.id ? `/api/social/templates/${tpl.id}` : "/api/social/templates";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tpl),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Save failed");
    success(tpl.id ? "Template diperbarui" : "Template dibuat");
    setEditorOpen(false);
    setEditingTemplate(null);
    await loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/social/templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Delete failed");
    success("Template dihapus");
    setEditorOpen(false);
    setEditingTemplate(null);
    await loadTemplates();
  };

  // Logs state
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<Stats>({ instagram: { success: 0, failed: 0, draft: 0 }, facebook: { success: 0, failed: 0, draft: 0 } });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "instagram" | "facebook">("all");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/settings");
      const data = await res.json();
      if (data.success) {
        setGlobal(data.data.global || defaultGlobal());
        setIg(data.data.instagram || defaultIg());
        setFb(data.data.facebook || defaultFb());
      }
    } catch { showError("Gagal memuat settings"); }
    setLoading(false);
  }, [showError]);

  const loadPosts = useCallback(async () => {
    setLogsLoading(true);
    try {
      const filter = logFilter !== "all" ? `?platform=${logFilter}` : "";
      const res = await fetch(`/api/social/posts${filter}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.data.posts || []);
        setStats(data.data.stats || stats);
      }
    } catch { /* ignore */ }
    setLogsLoading(false);
  }, [logFilter]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (activeTab === "logs") loadPosts(); }, [activeTab, loadPosts]);
  useEffect(() => { if (activeTab === "templates") loadTemplates(); }, [activeTab, loadTemplates]);

  const saveSection = async (scope: "global" | "instagram" | "facebook", data: unknown) => {
    setSaving(true);
    try {
      const res = await fetch("/api/social/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, data }),
      });
      const json = await res.json();
      if (json.success) {
        success(`Settings ${scope} disimpan`);
        loadSettings();
      } else {
        showError(json.error || "Gagal menyimpan");
      }
    } catch { showError("Gagal menyimpan"); }
    setSaving(false);
  };

  const isMetaConnected = !!(global?.metaAccessToken && global?.fbPageId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-txt-primary">
          <Share2 size={26} className="text-goto-green" />
          Social Media Auto-Publish
        </h1>
        <p className="text-sm text-txt-secondary">Auto-publish artikel ke Instagram & Facebook Page</p>
      </div>

      {/* Connection status banner */}
      <div className={`rounded-[12px] border p-4 ${isMetaConnected ? "border-goto-green/30 bg-goto-light" : "border-yellow-300 bg-yellow-50"}`}>
        <div className="flex items-start gap-3">
          {isMetaConnected ? <CheckCircle size={20} className="text-goto-green shrink-0 mt-0.5" /> : <AlertCircle size={20} className="text-yellow-600 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-txt-primary">
              {isMetaConnected ? "Meta Connected" : "Meta Belum Terhubung"}
            </p>
            <p className="mt-0.5 text-xs text-txt-secondary">
              {isMetaConnected
                ? `FB Page: ${global?.fbPageName || "—"} · IG: ${global?.igAccountName || "—"}`
                : "Hubungkan Facebook Page + Instagram Business Account untuk mulai auto-publish"}
            </p>
            {global?.metaTokenExpiresAt && (
              <p className="mt-1 text-[10px] text-txt-muted">
                Token expire: {new Date(global.metaTokenExpiresAt).toLocaleDateString("id-ID")}
              </p>
            )}
          </div>
          {isMetaConnected && (
            <button
              onClick={testPublish}
              disabled={testing}
              className="shrink-0 flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-green-dark disabled:opacity-60"
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {testing ? "Posting..." : "Test Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {([
          { key: "global", label: "Global", icon: Settings },
          { key: "instagram", label: "Instagram", icon: Instagram },
          { key: "facebook", label: "Facebook", icon: Facebook },
          { key: "templates", label: "Template", icon: Layout },
          { key: "logs", label: "Log Post", icon: RefreshCw },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === tab.key ? "border-goto-green text-goto-green" : "border-transparent text-txt-secondary hover:text-txt-primary"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="mx-auto animate-spin text-goto-green" /></div>
      ) : (
        <>
          {activeTab === "global" && global && (
            <GlobalSettingsForm settings={global} onSave={(d) => saveSection("global", d)} saving={saving} />
          )}
          {activeTab === "instagram" && ig && (
            <PlatformSettingsForm
              settings={ig}
              platform="instagram"
              onSave={(d) => saveSection("instagram", d)}
              saving={saving}
            />
          )}
          {activeTab === "facebook" && fb && (
            <PlatformSettingsForm
              settings={fb}
              platform="facebook"
              onSave={(d) => saveSection("facebook", d)}
              saving={saving}
            />
          )}
          {activeTab === "templates" && (
            <TemplatesView
              templates={templates}
              loading={templatesLoading}
              onCreate={() => { setEditingTemplate(null); setEditorOpen(true); }}
              onEdit={(t) => { setEditingTemplate(t); setEditorOpen(true); }}
              onRefresh={loadTemplates}
            />
          )}
          {activeTab === "logs" && (
            <LogsView posts={posts} stats={stats} loading={logsLoading} filter={logFilter} setFilter={setLogFilter} onRefresh={loadPosts} />
          )}
        </>
      )}

      {editorOpen && (
        <TemplateEditor
          template={editingTemplate}
          onSave={saveTemplate}
          onCancel={() => { setEditorOpen(false); setEditingTemplate(null); }}
          onDelete={editingTemplate?.id ? () => deleteTemplate(editingTemplate.id!) : undefined}
        />
      )}
    </div>
  );
}

/* ───── Templates View ───── */
function TemplatesView({
  templates,
  loading,
  onCreate,
  onEdit,
  onRefresh,
}: {
  templates: TemplateData[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (t: TemplateData) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-txt-primary">Template Post Sosmed</h2>
          <p className="text-xs text-txt-secondary">
            Desain template untuk membuat gambar artikel lebih menarik saat di-post ke Instagram & Facebook
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-border p-2 text-txt-secondary hover:bg-surface-secondary"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-green-dark"
          >
            <Plus size={14} />
            Template Baru
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-goto-green" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-[12px] border-2 border-dashed border-border p-10 text-center">
          <Layout size={32} className="mx-auto mb-3 text-txt-muted" />
          <p className="text-sm font-semibold text-txt-primary">Belum ada template</p>
          <p className="mt-1 text-xs text-txt-secondary">
            Buat template pertama untuk mempercantik post sosmed otomatis
          </p>
          <button
            onClick={onCreate}
            className="mt-4 rounded-full bg-goto-green px-5 py-2 text-sm font-semibold text-white hover:bg-goto-green-dark"
          >
            <Plus size={14} className="inline mr-1" />
            Buat Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const aspectClass =
              tpl.aspectRatio === "4:5" ? "aspect-[4/5]" :
              tpl.aspectRatio === "1:1" ? "aspect-square" : "aspect-[1.91/1]";
            return (
              <button
                key={tpl.id}
                onClick={() => onEdit(tpl)}
                className="group rounded-[12px] border border-border bg-surface p-3 text-left transition-all hover:border-goto-green hover:shadow-card-hover"
              >
                <div className={`${aspectClass} w-full rounded-lg bg-surface-tertiary overflow-hidden mb-3`}>
                  {tpl.templateImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tpl.templateImageUrl}
                      alt={tpl.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-txt-muted">
                      <Layout size={24} />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-txt-primary truncate">{tpl.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] rounded-full bg-surface-secondary px-2 py-0.5 text-txt-secondary">
                        {tpl.platform === "both" ? "IG + FB" : tpl.platform === "instagram" ? "Instagram" : "Facebook"}
                      </span>
                      <span className="text-[10px] rounded-full bg-surface-secondary px-2 py-0.5 text-txt-secondary">
                        {tpl.aspectRatio}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {tpl.isDefault && (
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    )}
                    {!tpl.isActive && (
                      <span className="text-[10px] text-red-500">off</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───── Global Settings Form ───── */
function GlobalSettingsForm({ settings, onSave, saving }: { settings: GlobalSettings; onSave: (d: Partial<GlobalSettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(settings);

  return (
    <div className="space-y-5">
      {/* Master switch */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-txt-primary">Auto-Publish Master Switch</p>
            <p className="text-xs text-txt-muted mt-0.5">Master on/off untuk auto-publish ke semua platform</p>
          </div>
          <button
            onClick={() => setForm({ ...form, autoPublishEnabled: !form.autoPublishEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.autoPublishEnabled ? "bg-goto-green" : "bg-surface-tertiary"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.autoPublishEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Draft Mode Toggle */}
      <div className={`rounded-[12px] border p-5 shadow-card ${form.draftModeEnabled ? "border-yellow-300 bg-yellow-50/40" : "border-border bg-surface"}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="text-sm font-semibold text-txt-primary flex items-center gap-2">
              📝 Draft Mode (Review dulu sebelum publish)
            </p>
            <p className="text-xs text-txt-muted mt-0.5">
              Aktifkan: Saat artikel publish, sistem hanya render gambar + caption, lalu masuk ke &quot;Log Post&quot; sebagai <b>Draft</b>.<br />
              Anda harus approve manual untuk posting ke FB/IG. Matikan = langsung publish otomatis.
            </p>
          </div>
          <button
            onClick={() => setForm({ ...form, draftModeEnabled: !form.draftModeEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.draftModeEnabled ? "bg-yellow-500" : "bg-surface-tertiary"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.draftModeEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Meta Credentials */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-txt-primary">Meta API Credentials</h3>
        <p className="text-xs text-txt-muted mb-4">Manual input Page Access Token dari Meta Developer dashboard (OAuth flow akan ditambahkan nanti).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">Meta Access Token</label>
            <input
              type="password"
              placeholder={form.metaAccessToken === "***configured***" ? "••••••••••••• (tersimpan)" : "EAAxxxx..."}
              onChange={(e) => setForm({ ...form, metaAccessToken: e.target.value || null })}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">FB Page ID</label>
            <input value={form.fbPageId || ""} onChange={(e) => setForm({ ...form, fbPageId: e.target.value || null })} className="input w-full text-sm" placeholder="1234567890" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">FB Page Name</label>
            <input value={form.fbPageName || ""} onChange={(e) => setForm({ ...form, fbPageName: e.target.value || null })} className="input w-full text-sm" placeholder="Jurnalis Hukum Bandung" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">IG User ID</label>
            <input value={form.igUserId || ""} onChange={(e) => setForm({ ...form, igUserId: e.target.value || null })} className="input w-full text-sm" placeholder="17841xxxxxx" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">IG Account Name</label>
            <input value={form.igAccountName || ""} onChange={(e) => setForm({ ...form, igAccountName: e.target.value || null })} className="input w-full text-sm" placeholder="@jurnalishukumbdg" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">Token Expires At</label>
            <input type="datetime-local" value={form.metaTokenExpiresAt ? form.metaTokenExpiresAt.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, metaTokenExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input w-full text-sm" />
          </div>
        </div>
      </div>

      {/* Brand Hashtags */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-txt-primary">Brand Hashtags (Shared)</h3>
        <p className="text-xs text-txt-muted mb-3">Hashtag yang selalu ditambahkan ke setiap post (IG + FB)</p>
        <TagsInput
          tags={form.fixedHashtagsBrand}
          onChange={(tags) => setForm({ ...form, fixedHashtagsBrand: tags })}
          placeholder="#HukumBandung, #JHB, #BeritaHukum"
        />
      </div>

      {/* Notifications */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-txt-primary">Notifikasi</h3>
        <label className="mb-1 block text-xs font-medium text-txt-primary">Email untuk Failed Post</label>
        <input type="email" value={form.notificationEmail || ""} onChange={(e) => setForm({ ...form, notificationEmail: e.target.value || null })} className="input w-full max-w-md text-sm" placeholder="admin@jurnalishukumbandung.com" />
      </div>

      <button
        onClick={() => onSave(form)}
        disabled={saving}
        className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Settings Global
      </button>
    </div>
  );
}

/* ───── Platform Settings Form (IG + FB share this) ───── */
function PlatformSettingsForm({ settings, platform, onSave, saving }: { settings: IgSettings | FbSettings; platform: "instagram" | "facebook"; onSave: (d: Partial<IgSettings | FbSettings>) => void; saving: boolean }) {
  const [form, setForm] = useState(settings as IgSettings & FbSettings);
  const isIg = platform === "instagram";

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-txt-primary">Enable Auto-Publish ke {isIg ? "Instagram" : "Facebook"}</p>
            <p className="text-xs text-txt-muted mt-0.5">Jika off, tidak akan post ke platform ini meskipun master switch on</p>
          </div>
          <button onClick={() => setForm({ ...form, enabled: !form.enabled })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.enabled ? "bg-goto-green" : "bg-surface-tertiary"}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* FB-specific: post format */}
      {!isIg && (
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-txt-primary">Default Post Format</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { val: "link_share", label: "Link Share", desc: "Preview card dari OG tags (recommended)" },
              { val: "photo", label: "Photo Post", desc: "Single image + caption dengan link" },
              { val: "multi_photo", label: "Multi Photo", desc: "Multiple images (phase 2)" },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setForm({ ...form, defaultPostFormat: opt.val })}
                className={`rounded-[12px] border p-3 text-left transition-colors ${form.defaultPostFormat === opt.val ? "border-goto-green bg-goto-light" : "border-border hover:border-goto-green/50"}`}
                disabled={opt.val === "multi_photo"}
              >
                <p className="text-sm font-semibold text-txt-primary">{opt.label}</p>
                <p className="mt-0.5 text-xs text-txt-muted">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image settings */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-txt-primary">Image Settings</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">Aspect Ratio</label>
            <select value={form.aspectRatio} onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })} className="input w-full text-sm">
              {isIg ? (
                <>
                  <option value="4:5">4:5 (Portrait, recommended IG)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="1.91:1">1.91:1 (Landscape)</option>
                </>
              ) : (
                <>
                  <option value="1.91:1">1.91:1 (Link preview, recommended FB)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:5">4:5 (Portrait)</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">JPEG Quality</label>
            <input type="number" min="50" max="100" value={form.jpegQuality} onChange={(e) => setForm({ ...form, jpegQuality: parseInt(e.target.value) || 85 })} className="input w-full text-sm" />
          </div>
        </div>
      </div>

      {/* Hashtags */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-txt-primary">Hashtags</h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">Target Count</label>
            <input type="number" min="0" max="30" value={form.hashtagCountTarget} onChange={(e) => setForm({ ...form, hashtagCountTarget: parseInt(e.target.value) || 0 })} className="input w-full text-sm" />
            <p className="mt-1 text-[10px] text-txt-muted">{isIg ? "IG: 10-15 recommended" : "FB: 3-5 recommended"}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-txt-primary">Publish Delay (detik)</label>
            <input type="number" min="0" value={form.publishDelaySec} onChange={(e) => setForm({ ...form, publishDelaySec: parseInt(e.target.value) || 0 })} className="input w-full text-sm" />
            <p className="mt-1 text-[10px] text-txt-muted">{isIg ? "Delay sebelum post (0 = instant)" : "Stagger dari IG (300s = 5 menit after)"}</p>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-txt-primary">Fixed Hashtags (khusus {isIg ? "IG" : "FB"})</label>
          <TagsInput
            tags={isIg ? form.fixedHashtagsIg : form.fixedHashtagsFb}
            onChange={(tags) => setForm(isIg ? { ...form, fixedHashtagsIg: tags } : { ...form, fixedHashtagsFb: tags })}
            placeholder={isIg ? "#HukumBandung, #Pengadilan" : "#Bandung, #JawaBarat"}
          />
        </div>
      </div>

      {/* FB-specific: link position + UTM */}
      {!isIg && (
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-txt-primary">Link Behavior</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-txt-primary">Posisi Link</label>
              <select value={form.linkPosition} onChange={(e) => setForm({ ...form, linkPosition: e.target.value })} className="input w-full text-sm">
                <option value="end">Di akhir caption (preview card dominant)</option>
                <option value="start">Di awal caption (push link)</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-txt-muted">UTM params akan otomatis ditambahkan: ?utm_source=facebook&utm_medium=social</p>
        </div>
      )}

      {/* Caption tone override */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-2 text-sm font-semibold text-txt-primary">Caption Tone Override</h3>
        <p className="text-xs text-txt-muted mb-2">Kosongkan jika ingin pakai tone global</p>
        <textarea
          value={form.captionToneOverride || ""}
          onChange={(e) => setForm({ ...form, captionToneOverride: e.target.value || null })}
          className="input w-full text-sm min-h-[80px]"
          placeholder={isIg ? "Contoh: Tone engaging, visual-first, pakai emoji sesekali..." : "Contoh: Tone informatif, to-the-point, professional..."}
        />
      </div>

      <button onClick={() => onSave(form)} disabled={saving} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Settings {isIg ? "Instagram" : "Facebook"}
      </button>
    </div>
  );
}

/* ───── Logs View ───── */
function LogsView({ posts, stats, loading, filter, setFilter, onRefresh }: { posts: SocialPost[]; stats: Stats; loading: boolean; filter: string; setFilter: (f: "all" | "instagram" | "facebook") => void; onRefresh: () => void }) {
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);

  const approveDraft = async (id: string) => {
    if (!confirm("Approve & publish draft ini ke platform?")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Approve failed");
      alert(`Draft berhasil dipublish. Status: ${data.data.result.status}`);
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActioningId(null);
    }
  };

  const rejectDraft = async (id: string) => {
    if (!confirm("Tolak draft ini? File gambar akan dihapus.")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Reject failed");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActioningId(null);
    }
  };

  const takedown = async (id: string) => {
    if (!confirm("Takedown post ini dari platform?\nAksi ini tidak bisa dibatalkan.")) return;
    setActioningId(id);
    try {
      const res = await fetch(`/api/social/posts/${id}/takedown`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Takedown failed");
      alert("Post berhasil di-takedown");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Takedown failed");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50"><Instagram size={20} className="text-pink-600" /></div>
            <div>
              <p className="text-sm font-semibold text-txt-primary">Instagram</p>
              <p className="text-xs text-txt-muted">
                {stats.instagram.success} sukses · {stats.instagram.failed} gagal
                {stats.instagram.draft > 0 && <span className="text-yellow-600"> · {stats.instagram.draft} draft</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50"><Facebook size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm font-semibold text-txt-primary">Facebook</p>
              <p className="text-xs text-txt-muted">
                {stats.facebook.success} sukses · {stats.facebook.failed} gagal
                {stats.facebook.draft > 0 && <span className="text-yellow-600"> · {stats.facebook.draft} draft</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(["all", "instagram", "facebook"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-goto-green text-white" : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"}`}>
              {f === "all" ? "Semua" : f === "instagram" ? "Instagram" : "Facebook"}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-txt-secondary hover:bg-surface-secondary">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Log table */}
      <div className="overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Artikel</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Platform</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Format</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Tanggal</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 size={24} className="mx-auto animate-spin text-goto-green" /></td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-txt-muted">Belum ada log social post</td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50">
                  <td className="px-4 py-3">
                    <Link href={`/berita/${p.article.slug}`} target="_blank" className="text-sm font-medium text-txt-primary hover:text-goto-green truncate max-w-[260px] block">
                      {p.article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${p.platform === "instagram" ? "bg-pink-50 text-pink-600" : "bg-blue-50 text-blue-600"}`}>
                      {p.platform === "instagram" ? <Instagram size={10} /> : <Facebook size={10} />}
                      {p.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "success" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600"><CheckCircle size={10} /> Sukses</span>
                    ) : p.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600" title={p.errorMessage || ""}><XCircle size={10} /> Gagal</span>
                    ) : p.status === "draft" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700">📝 Draft</span>
                    ) : p.status === "deleted" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">🗑️ Deleted</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-600"><Clock size={10} /> Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-txt-secondary">{p.postFormat || "-"}</td>
                  <td className="px-4 py-3 text-xs text-txt-muted">{new Date(p.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      {p.renderedImageUrl && (
                        <button
                          onClick={() => setPreviewPost(p)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Eye size={11} /> Preview
                        </button>
                      )}
                      {p.status === "draft" && (
                        <>
                          <button
                            onClick={() => approveDraft(p.id)}
                            disabled={actioningId === p.id}
                            className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline disabled:opacity-50"
                          >
                            {actioningId === p.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            Publish
                          </button>
                          <button
                            onClick={() => rejectDraft(p.id)}
                            disabled={actioningId === p.id}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            <X size={11} /> Tolak
                          </button>
                        </>
                      )}
                      {p.externalUrl && p.status === "success" && (
                        <>
                          <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-goto-green hover:underline">
                            <ExternalLink size={11} /> Lihat
                          </a>
                          <button
                            onClick={() => takedown(p.id)}
                            disabled={actioningId === p.id}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            <Trash2 size={11} /> Takedown
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Preview modal */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewPost(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[12px] bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-5 py-3">
              <div>
                <h3 className="text-base font-bold text-txt-primary">Preview Post</h3>
                <p className="text-xs text-txt-secondary">{previewPost.platform} · {previewPost.article.title}</p>
              </div>
              <button onClick={() => setPreviewPost(null)} className="rounded-full p-1.5 text-txt-secondary hover:bg-surface-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {previewPost.renderedImageUrl && (
                <div className="rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewPost.renderedImageUrl} alt="preview" className="w-full" />
                </div>
              )}
              {previewPost.captionFinal && (
                <div>
                  <p className="text-xs font-semibold text-txt-secondary mb-1">Caption:</p>
                  <pre className="whitespace-pre-wrap text-sm text-txt-primary bg-surface-secondary p-3 rounded-lg font-sans">
                    {previewPost.captionFinal}
                  </pre>
                </div>
              )}
              {previewPost.errorMessage && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs font-semibold text-red-700">Error:</p>
                  <p className="text-xs text-red-600 mt-1">{previewPost.errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Tags Input Component ───── */
function TagsInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");

  const add = () => {
    const cleaned = input.trim().replace(/^#/, "");
    if (cleaned && !tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-goto-light px-2.5 py-1 text-xs font-medium text-goto-green">
            #{t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-goto-green hover:text-red-500"><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="input flex-1 text-xs"
        />
        <button onClick={add} className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-txt-secondary hover:bg-surface-secondary">
          <Plus size={12} /> Tambah
        </button>
      </div>
    </div>
  );
}

/* ───── Defaults ───── */
function defaultGlobal(): GlobalSettings {
  return {
    autoPublishEnabled: false,
    draftModeEnabled: false,
    metaAccessToken: null, fbPageId: null, fbPageName: null,
    igUserId: null, igAccountName: null, metaTokenExpiresAt: null,
    captionPromptTemplate: null, captionSafetyRules: null,
    fixedHashtagsBrand: [],
    notificationEmail: null,
  };
}

function defaultIg(): IgSettings {
  return {
    enabled: false, aspectRatio: "4:5", jpegQuality: 85,
    watermarkPngUrl: null, hashtagCountTarget: 12, fixedHashtagsIg: [],
    captionToneOverride: null, publishDelaySec: 0,
  };
}

function defaultFb(): FbSettings {
  return {
    enabled: false, defaultPostFormat: "link_share",
    aspectRatio: "1.91:1", jpegQuality: 85,
    hashtagCountTarget: 4, fixedHashtagsFb: [],
    captionToneOverride: null, publishDelaySec: 300,
    linkPosition: "end",
  };
}

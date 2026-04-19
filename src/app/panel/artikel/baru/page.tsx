"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  Save,
  Send,
  ChevronDown,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Lightbulb,
  CalendarClock,
} from "lucide-react";
// ImageUploader removed — images now inserted inline via RichTextEditor

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-[500px] animate-pulse rounded-[12px] bg-surface-secondary" /> }
);

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Source {
  name: string;
  title: string;
  institution: string;
  url: string;
}

import { CAN_SUBMIT_REVIEW, EDITOR_ROLES, roleLabelsMap } from "@/lib/roles";

export default function NewArticlePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const userRole = session?.user?.role || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [sources, setSources] = useState<Source[]>([{ name: "", title: "", institution: "", url: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showSeo, setShowSeo] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAutosaveBanner, setShowAutosaveBanner] = useState(false);
  const [users, setUsers] = useState<{id: string; name: string; role: string}[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [selectedEditorId, setSelectedEditorId] = useState("");
  const [isTeamArticle, setIsTeamArticle] = useState(false);
  const [coAuthorIds, setCoAuthorIds] = useState<string[]>([]);
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  // Word counter calculations
  const plainText = content.replace(/<[^>]*>/g, "").trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const charCount = plainText.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const AUTOSAVE_KEY = "autosave_draft_new";

  // Auto-extract featured image from first image in content
  useEffect(() => {
    const match = content.match(/<img[^>]+src="([^"]+)"/);
    setFeaturedImage(match ? match[1] : "");
  }, [content]);

  // Check for auto-saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        setShowAutosaveBanner(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Auto-save every 15 seconds + on beforeunload (protect against VPS restarts/crashes)
  useEffect(() => {
    const saveDraft = () => {
      if (title.trim() || content.trim()) {
        try {
          const draft = { title, content, categoryId, excerpt, tags, sources, savedAt: Date.now() };
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
        } catch {
          // localStorage not available
        }
      }
    };

    autosaveTimerRef.current = setInterval(saveDraft, 15000);
    window.addEventListener("beforeunload", saveDraft);

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
      window.removeEventListener("beforeunload", saveDraft);
    };
  }, [title, content, categoryId, excerpt, tags, sources]);

  function loadAutosaveDraft() {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.content) setContent(draft.content);
        if (draft.categoryId) setCategoryId(draft.categoryId);
        if (draft.excerpt) setExcerpt(draft.excerpt);
        if (draft.tags) setTags(draft.tags);
        if (draft.sources) setSources(draft.sources);
      }
    } catch {
      // ignore
    }
    setShowAutosaveBanner(false);
  }

  function discardAutosaveDraft() {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore
    }
    setShowAutosaveBanner(false);
  }

  const [checklist, setChecklist] = useState({
    notClickbait: false,
    hasSource: false,
    balanced: false,
    noSara: false,
    properLanguage: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  const [trendingSuggestions, setTrendingSuggestions] = useState<{ label: string; hot: boolean; region?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [trendRegion, setTrendRegion] = useState<"all" | "bandung" | "jabar" | "nasional">("all");

  // Fetch trending suggestions
  useEffect(() => {
    async function fetchTrending() {
      try {
        const url = trendRegion === "all" ? "/api/trending" : `/api/trending?region=${trendRegion}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || [];
          setTrendingSuggestions(data);
        }
      } catch { /* ignore */ }
    }
    fetchTrending();
  }, [trendRegion]);

  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const generateAI = async (feature: string, setter: (val: string) => void) => {
    if (!title.trim() || !content.trim()) return;
    setAiLoading((prev) => ({ ...prev, [feature]: true }));
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, title, content }),
      });
      const data = await res.json();
      if (data.success && data.data?.result) {
        setter(data.data.result);
      } else {
        setError(data.error || "Gagal generate AI");
      }
    } catch {
      setError("Gagal menghubungi AI service");
    } finally {
      setAiLoading((prev) => ({ ...prev, [feature]: false }));
    }
  };

  const AiButton = ({ feature, setter }: { feature: string; setter: (val: string) => void }) => (
    <button
      type="button"
      onClick={() => generateAI(feature, setter)}
      disabled={!title.trim() || !content.trim() || aiLoading[feature]}
      className="flex items-center gap-1 text-xs text-goto-green hover:underline disabled:opacity-40 disabled:no-underline"
    >
      {aiLoading[feature] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
      Generate AI
    </button>
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || []);
      }
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch users for author/editor dropdowns
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const json = await res.json();
          setUsers(json.data || []);
        }
      } catch { /* ignore */ }
    }
    if (session?.user) {
      fetchUsers();
    }
  }, [session?.user]);

  const addSource = () => {
    if (sources.length > 0 && !sources[sources.length - 1].name.trim()) {
      return;
    }
    setSources([...sources, { name: "", title: "", institution: "", url: "" }]);
  };

  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const updateSource = (index: number, field: keyof Source, value: string) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], [field]: value };
    setSources(updated);
  };

  const handleSubmit = async (status: "DRAFT" | "IN_REVIEW") => {
    setError("");

    if (!title.trim()) return setError("Judul wajib diisi");
    if (!content.trim()) return setError("Konten tidak boleh kosong");
    if (content.length < 50) return setError("Konten minimal 50 karakter");
    if (!categoryId) return setError("Kategori harus dipilih");

    if (status === "IN_REVIEW" && !allChecked) {
      setShowChecklist(true);
      return setError("Semua checklist jurnalistik harus dipenuhi sebelum submit");
    }

    // Confirmation dialog for review submission
    if (status === "IN_REVIEW") {
      const ok = await confirm({ message: "Artikel akan dikirim untuk review oleh editor. Lanjutkan?", variant: "warning", title: "Konfirmasi" });
      if (!ok) {
        return;
      }
    }

    setSaving(true);

    try {
      const validSources = sources.filter((s) => s.name.trim());
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          excerpt: excerpt || undefined,
          categoryId,
          tags: tagList,
          featuredImage: featuredImage || undefined,
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          status,
          sources: validSources.length > 0 ? validSources : undefined,
          authorId: selectedAuthorId || undefined,
          assignedEditorId: selectedEditorId || undefined,
          coAuthors: isTeamArticle && coAuthorIds.length > 0
            ? coAuthorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(", ")
            : undefined,
          scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal menyimpan artikel");
        setSaving(false);
        return;
      }

      // Clear auto-save after successful creation
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
      const articleId = data.data?.id;
      success(status === "IN_REVIEW" ? "Artikel berhasil dikirim untuk review" : "Artikel berhasil disimpan sebagai draf");

      // Jika Editor/Super Admin, tampilkan panel aksi inline
      if (articleId && EDITOR_ROLES.includes(userRole)) {
        setSavedArticleId(articleId);
        setSavedStatus(status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT");
        setSaving(false);
      } else {
        router.push("/panel/artikel");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setSaving(false);
    }
  };

  // ── Workflow actions (approve/reject/publish) ──
  async function handleWorkflowAction(newStatus: string, reviewNote?: string) {
    if (!savedArticleId) return;
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (reviewNote) body.reviewNote = reviewNote;
      const res = await fetch(`/api/articles/${savedArticleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error || "Gagal mengubah status");
      } else {
        setSavedStatus(newStatus);
        const labels: Record<string, string> = {
          APPROVED: "Artikel disetujui",
          PUBLISHED: "Artikel berhasil dipublikasikan",
          REJECTED: "Artikel ditolak dan dikembalikan ke draf",
          IN_REVIEW: "Artikel dikembalikan ke review",
          DRAFT: "Artikel dikembalikan ke draf",
        };
        success(labels[newStatus] || "Status berhasil diubah");
      }
    } catch {
      showError("Terjadi kesalahan");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Jika artikel sudah tersimpan, tampilkan panel aksi workflow ──
  if (savedArticleId && savedStatus) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-[12px] border border-border bg-surface p-6 sm:p-8 shadow-card text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-goto-green/10">
            <svg className="h-7 w-7 text-goto-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-txt-primary mb-2">Artikel Berhasil Disimpan</h2>
          <p className="text-sm text-txt-secondary mb-1">&ldquo;{title}&rdquo;</p>
          <p className="text-sm font-medium text-txt-secondary mb-6">
            Status: <span className="text-goto-green font-semibold">{savedStatus === "IN_REVIEW" ? "Menunggu Review" : savedStatus === "APPROVED" ? "Disetujui" : savedStatus === "PUBLISHED" ? "Dipublikasikan" : savedStatus === "REJECTED" ? "Ditolak" : "Draf"}</span>
          </p>

          <div className="flex flex-col gap-3">
            {/* IN_REVIEW → Setujui atau Tolak */}
            {savedStatus === "IN_REVIEW" && (
              <>
                <button onClick={() => handleWorkflowAction("APPROVED")} disabled={actionLoading} className="btn-primary w-full py-3">
                  {actionLoading ? "Memproses..." : "Setujui Artikel"}
                </button>
                <button onClick={async () => {
                  const note = prompt("Alasan penolakan (opsional):");
                  await handleWorkflowAction("DRAFT", note || undefined);
                }} disabled={actionLoading} className="w-full rounded-full border-2 border-red-500 px-6 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  Tolak & Kembalikan ke Draf
                </button>
              </>
            )}

            {/* APPROVED → Publish atau Tolak */}
            {savedStatus === "APPROVED" && (
              <>
                <button onClick={() => handleWorkflowAction("PUBLISHED")} disabled={actionLoading} className="btn-primary w-full py-3">
                  {actionLoading ? "Memproses..." : "Publikasikan Sekarang"}
                </button>
                <button onClick={() => handleWorkflowAction("IN_REVIEW")} disabled={actionLoading} className="w-full rounded-full border-2 border-yellow-500 px-6 py-3 text-sm font-semibold text-yellow-600 hover:bg-yellow-50 transition-colors">
                  Kembalikan ke Review
                </button>
              </>
            )}

            {/* PUBLISHED → Selesai */}
            {savedStatus === "PUBLISHED" && (
              <p className="text-sm text-goto-green font-medium">Artikel sudah live!</p>
            )}

            {/* REJECTED/DRAFT → Info */}
            {savedStatus === "DRAFT" && (
              <p className="text-sm text-txt-secondary">Artikel dikembalikan ke draf untuk direvisi penulis.</p>
            )}

            <div className="flex gap-3 mt-2">
              <button onClick={() => router.push(`/panel/artikel/${savedArticleId}/edit`)} className="btn-secondary flex-1 py-2.5">
                Edit Artikel
              </button>
              <button onClick={() => router.push("/panel/artikel")} className="btn-ghost flex-1 py-2.5">
                Ke Daftar Artikel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-txt-primary">
            Tulis Artikel Baru
          </h1>
          <p className="text-sm text-txt-secondary">
            Pastikan mengikuti standar jurnalistik
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Save Draft */}
          <button
            onClick={() => handleSubmit("DRAFT")}
            disabled={saving}
            className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            Simpan Draf
          </button>
          {/* Submit for review */}
          {CAN_SUBMIT_REVIEW.includes(userRole) && (
            <button
              onClick={() => handleSubmit("IN_REVIEW")}
              disabled={saving}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Send size={16} />
              Kirim untuk Review
            </button>
          )}
          {/* Schedule toggle */}
          {EDITOR_ROLES.includes(userRole) && (
            <button
              type="button"
              onClick={() => setShowSchedule(!showSchedule)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                showSchedule ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border text-txt-secondary hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              <CalendarClock size={16} />
              Jadwalkan
            </button>
          )}
        </div>
      </div>

      {/* Schedule panel */}
      {showSchedule && (
        <div className="mb-4 rounded-[12px] border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800">
            <CalendarClock size={16} />
            Jadwalkan Publikasi
          </h3>
          <p className="mb-3 text-xs text-blue-600">
            Artikel akan otomatis dipublikasi pada waktu yang dipilih setelah disetujui editor.
          </p>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
            className="input w-full max-w-xs text-sm"
          />
          {scheduleDate && (
            <p className="mt-2 text-xs text-blue-700">
              Dijadwalkan: {new Date(scheduleDate).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
        </div>
      )}

      {/* Auto-save recovery banner */}
      {showAutosaveBanner && (
        <div className="mb-4 flex items-center gap-3 rounded-[12px] border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="flex-1">Ada draf tersimpan otomatis. Muat draf?</span>
          <button
            onClick={loadAutosaveDraft}
            className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600"
          >
            Muat
          </button>
          <button
            onClick={discardAutosaveDraft}
            className="rounded-full border border-yellow-400 px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
          >
            Abaikan
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Trending Suggestions */}
      {showSuggestions && (
        <div className="mb-4 rounded-[12px] border border-border bg-surface p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-goto-light">
                <Lightbulb size={14} className="text-goto-green" />
              </div>
              <h3 className="text-sm font-bold text-txt-primary">Ide Berita dari Trending</h3>
              <span className="text-xs text-txt-muted">— klik untuk pakai sebagai judul</span>
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-xs text-txt-muted hover:text-txt-secondary"
            >
              Tutup
            </button>
          </div>
          {/* Region tabs */}
          <div className="mb-3 flex gap-1.5">
            {([["all", "Semua"], ["bandung", "Bandung"], ["jabar", "Jawa Barat"], ["nasional", "Nasional"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTrendRegion(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  trendRegion === key
                    ? "bg-goto-green text-white"
                    : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSuggestions.length > 0 ? trendingSuggestions.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTitle(item.label)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:border-goto-green hover:text-goto-green ${
                  item.hot
                    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-50"
                    : "border-border bg-surface-secondary text-txt-secondary"
                }`}
              >
                {item.hot && <TrendingUp size={11} />}
                {item.label}
              </button>
            )) : (
              <p className="text-xs text-txt-muted">Memuat trending...</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main editor */}
        <div className="space-y-4 lg:col-span-2">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul Artikel"
            className="input w-full px-4 py-3 text-xl font-bold"
          />

          {/* Editor */}
          <div className="rounded-[12px] border border-border overflow-hidden">
            <RichTextEditor content={content} onChange={setContent} />
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-sm text-txt-muted">
              <span>{wordCount} kata</span>
              <span className="text-border">|</span>
              <span>{charCount} karakter</span>
              <span className="text-border">|</span>
              <span>{readTime} menit baca</span>
            </div>
          </div>

          {/* Sources */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-txt-primary uppercase tracking-wider">
                Sumber & Narasumber
              </h3>
              <button
                type="button"
                onClick={addSource}
                className="flex items-center gap-1 text-xs text-goto-green hover:underline"
              >
                <Plus size={14} /> Tambah Sumber
              </button>
            </div>
            <div className="space-y-3">
              {sources.map((source, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-[12px] border border-border p-3">
                  <input
                    type="text"
                    placeholder="Nama narasumber *"
                    value={source.name}
                    onChange={(e) => updateSource(i, "name", e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={source.title}
                    onChange={(e) => updateSource(i, "title", e.target.value)}
                    className="input text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Institusi"
                    value={source.institution}
                    onChange={(e) => updateSource(i, "institution", e.target.value)}
                    className="input text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="URL referensi"
                      value={source.url}
                      onChange={(e) => updateSource(i, "url", e.target.value)}
                      className="input flex-1 text-sm"
                    />
                    {sources.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSource(i)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEO Settings */}
          <div className="rounded-[12px] border border-border bg-surface">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium text-txt-primary uppercase tracking-wider"
            >
              Pengaturan SEO
              <ChevronDown size={16} className={showSeo ? "rotate-180" : ""} />
            </button>
            {showSeo && (
              <div className="space-y-3 border-t border-border px-6 py-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-txt-primary">Judul SEO ({seoTitle.length}/150)</label>
                    <AiButton feature="seo_title" setter={setSeoTitle} />
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    maxLength={150}
                    placeholder={title || "Judul untuk mesin pencari"}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-txt-primary">Deskripsi SEO ({seoDescription.length}/300)</label>
                    <AiButton feature="meta_description" setter={setSeoDescription} />
                  </div>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Deskripsi singkat untuk hasil pencarian"
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Category */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <label className="mb-2 block text-sm font-medium text-txt-primary">
              Kategori *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input w-full"
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Penulis — only for admin/editor */}
          {EDITOR_ROLES.includes(userRole) && (
            <div className="rounded-[12px] border border-border bg-surface p-6">
              <label className="mb-2 block text-sm font-medium text-txt-primary">
                Penulis
              </label>
              <select
                value={selectedAuthorId}
                onChange={(e) => setSelectedAuthorId(e.target.value)}
                className="input w-full"
              >
                <option value="">Saya sendiri</option>
                {users
                  .filter(u => ["JOURNALIST", "CONTRIBUTOR", "EDITOR", "SUPER_ADMIN"].includes(u.role))
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({roleLabelsMap[u.role] || u.role})</option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Tim Redaksi — co-authors */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-txt-primary">Tim Redaksi</label>
              <button
                type="button"
                onClick={() => { setIsTeamArticle(!isTeamArticle); if (isTeamArticle) setCoAuthorIds([]); }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isTeamArticle ? "bg-goto-green" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${isTeamArticle ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <p className="mt-1 text-xs text-txt-muted">Aktifkan jika artikel ditulis oleh lebih dari satu penulis</p>
            {isTeamArticle && (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-txt-secondary">Pilih anggota tim:</label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {users
                    .filter(u => ["JOURNALIST", "CONTRIBUTOR", "EDITOR", "SUPER_ADMIN"].includes(u.role))
                    .map(u => (
                      <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-secondary">
                        <input
                          type="checkbox"
                          checked={coAuthorIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setCoAuthorIds([...coAuthorIds, u.id]);
                            else setCoAuthorIds(coAuthorIds.filter(id => id !== u.id));
                          }}
                          className="h-4 w-4 rounded border-border text-goto-green focus:ring-goto-green"
                        />
                        <span className="text-sm text-txt-primary">{u.name}</span>
                        <span className="text-xs text-txt-muted">({roleLabelsMap[u.role] || u.role})</span>
                      </label>
                    ))
                  }
                </div>
                {coAuthorIds.length > 0 && (
                  <p className="text-xs text-goto-green">
                    {coAuthorIds.length} penulis dipilih: {coAuthorIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pilih Editor — for all roles */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <label className="mb-2 block text-sm font-medium text-txt-primary">
              Editor
            </label>
            <select
              value={selectedEditorId}
              onChange={(e) => setSelectedEditorId(e.target.value)}
              className="input w-full"
            >
              <option value="">Otomatis (random)</option>
              {users
                .filter(u => ["EDITOR", "SUPER_ADMIN"].includes(u.role))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({roleLabelsMap[u.role] || u.role})</option>
                ))
              }
            </select>
          </div>

          {/* Tags */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-txt-primary">Tags</label>
              <AiButton feature="tags" setter={setTags} />
            </div>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tag1, Tag2, Tag3"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-txt-muted">Pisahkan dengan koma</p>
          </div>

          {/* Excerpt */}
          <div className="rounded-[12px] border border-border bg-surface p-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-txt-primary">Ringkasan</label>
              <AiButton feature="summary" setter={setExcerpt} />
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="Ringkasan singkat artikel"
              maxLength={500}
              className="input w-full"
            />
          </div>

          {/* Journalism Checklist */}
          <div className="rounded-[12px] border border-goto-green/20 bg-goto-50 p-4">
            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex w-full items-center justify-between text-sm font-bold text-goto-dark"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle size={16} />
                Checklist Jurnalistik
              </span>
              <ChevronDown size={14} className={showChecklist ? "rotate-180" : ""} />
            </button>
            {showChecklist && (
              <div className="mt-3 space-y-2">
                {[
                  { key: "notClickbait" as const, label: "Judul tidak clickbait / sensasional berlebihan" },
                  { key: "hasSource" as const, label: "Minimal 1 sumber terverifikasi" },
                  { key: "balanced" as const, label: "Cover both sides (perspektif berimbang)" },
                  { key: "noSara" as const, label: "Tidak mengandung unsur SARA" },
                  { key: "properLanguage" as const, label: "Bahasa sesuai PUEBI" },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-2 text-xs text-goto-green">
                    <input
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [item.key]: e.target.checked })
                      }
                      className="mt-0.5 rounded"
                    />
                    {item.label}
                  </label>
                ))}
                {allChecked && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-goto-green">
                    <CheckCircle size={12} /> Semua checklist terpenuhi
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

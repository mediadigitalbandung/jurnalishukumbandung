"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Megaphone,
  Sparkles,
  Copy,
  Check,
  Upload,
  Loader2,
  ExternalLink,
  AlertCircle,
  Wand2,
  ImageIcon,
  Calendar,
} from "lucide-react";

type AdSlot = "HEADER" | "SIDEBAR" | "IN_ARTICLE" | "FOOTER" | "BETWEEN_SECTIONS" | "POPUP" | "FLOATING_BOTTOM";

const SLOT_OPTIONS: { value: AdSlot; label: string; dim: string }[] = [
  { value: "HEADER", label: "Header (atas artikel)", dim: "1200×300" },
  { value: "IN_ARTICLE", label: "Dalam artikel (tengah body)", dim: "600×300" },
  { value: "POPUP", label: "Popup (modal)", dim: "800×800" },
  { value: "FLOATING_BOTTOM", label: "Floating bawah (mobile)", dim: "600×150" },
  { value: "SIDEBAR", label: "Sidebar (vertical)", dim: "300×600" },
  { value: "BETWEEN_SECTIONS", label: "Antar section", dim: "800×200" },
  { value: "FOOTER", label: "Footer (bawah artikel)", dim: "1200×150" },
];

const STYLE_PRESETS = [
  { value: "modern", label: "🚀 Modern (clean, tech-feel)" },
  { value: "elegant", label: "💎 Elegant (premium, luxurious)" },
  { value: "playful", label: "🎨 Playful (warna cerah, fun)" },
  { value: "formal", label: "🏛️ Formal (corporate, professional)" },
  { value: "urgent", label: "🔥 Urgent (sale, urgency feel)" },
];

export default function AdBriefPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step tracker
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Brief form
  const [clientName, setClientName] = useState("");
  const [productOrService, setProductOrService] = useState("");
  const [mainMessage, setMainMessage] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [slot, setSlot] = useState<AdSlot>("IN_ARTICLE");
  const [brandColors, setBrandColors] = useState("");
  const [styleHint, setStyleHint] = useState("modern");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  // Step 2: Generated prompt
  const [prompt, setPrompt] = useState("");
  const [recommendedDimensions, setRecommendedDimensions] = useState("");
  const [copied, setCopied] = useState(false);

  // Step 3: Upload + create Ad
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [priority, setPriority] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createdAdId, setCreatedAdId] = useState<string | null>(null);

  // ─── Step 1 → 2: Generate prompt ───
  const handleGeneratePrompt = async () => {
    if (!clientName.trim() || !productOrService.trim() || !mainMessage.trim() || !callToAction.trim() || !targetUrl.trim()) {
      showError("Isi semua field wajib (client, produk, pesan, CTA, URL)");
      return;
    }
    setGenerating(true);
    try {
      const colors = brandColors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const res = await fetch("/api/iklan/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          productOrService,
          mainMessage,
          callToAction,
          targetUrl,
          slot,
          brandColors: colors.length ? colors : undefined,
          styleHint,
          additionalNotes: additionalNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Gagal generate prompt");
      setPrompt(json.data.prompt);
      setRecommendedDimensions(json.data.recommendedDimensions);
      setStep(2);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error");
    }
    setGenerating(false);
  };

  // ─── Copy prompt to clipboard ───
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      success("Prompt di-copy ke clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showError("Gagal copy");
    }
  };

  // ─── Upload design file ───
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      showError("File harus image (PNG/JPG/WebP)");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Upload gagal");
      setUploadedUrl(json.data.url);
      success("Design ter-upload");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Upload error");
    }
    setUploading(false);
  };

  // ─── Create Ad ───
  const handleCreateAd = async () => {
    if (!uploadedUrl) {
      showError("Upload design dulu");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/iklan/from-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          clientName,
          slot,
          targetUrl,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          priority,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Gagal");
      setCreatedAdId(json.data.ad.id);
      success(json.data.message);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error");
    }
    setCreating(false);
  };

  // ─── Auto-redirect after creation ───
  useEffect(() => {
    if (!createdAdId) return;
    const t = setTimeout(() => router.push("/panel/iklan"), 4000);
    return () => clearTimeout(t);
  }, [createdAdId, router]);

  // ─── Render ───
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/panel/iklan" className="mb-2 inline-flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary">
        <ArrowLeft size={12} /> Kembali ke Iklan
      </Link>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-txt-primary">
        <Wand2 size={24} className="text-purple-600" />
        Buat Iklan via Claude Design
      </h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Workflow 3 langkah: brief order → copy prompt ke <a href="https://claude.ai/design" target="_blank" rel="noreferrer" className="text-purple-600 underline">Claude Design</a> → upload hasil → otomatis jadi Ad.
      </p>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step >= s ? "bg-purple-600 text-white" : "bg-surface-secondary text-txt-muted"}`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            <span className={`text-sm font-medium ${step >= s ? "text-txt-primary" : "text-txt-muted"}`}>
              {s === 1 ? "Brief Order" : s === 2 ? "Copy Prompt" : "Upload & Live"}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-purple-600" : "bg-surface-secondary"}`} />}
          </div>
        ))}
      </div>

      {/* Created banner */}
      {createdAdId && (
        <div className="mb-6 rounded-[12px] border-2 border-green-300 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <Check size={28} className="mt-1 text-green-600" />
            <div>
              <h2 className="text-lg font-bold text-green-900">Iklan Live!</h2>
              <p className="mt-1 text-sm text-green-800">Iklan untuk <strong>{clientName}</strong> sudah aktif di slot <strong>{slot}</strong>. Auto-redirect ke daftar iklan dalam 4 detik...</p>
              <Link href="/panel/iklan" className="mt-3 inline-flex items-center gap-1 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                Ke Daftar Iklan →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 1: Brief Form ─── */}
      {step === 1 && (
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-bold text-txt-primary">Step 1: Input Brief Order</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Nama Klien *</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="input mt-1 w-full text-sm" placeholder="contoh: Kantor Hukum Wijaya & Partners" />
            </div>
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Produk / Jasa *</label>
              <input type="text" value={productOrService} onChange={(e) => setProductOrService(e.target.value)} className="input mt-1 w-full text-sm" placeholder="contoh: Konsultasi hukum perdata" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-txt-secondary">Pesan Utama *</label>
            <textarea value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} rows={2} className="input mt-1 w-full text-sm" placeholder="contoh: Solusi hukum cepat & profesional, ditangani advokat berpengalaman 15 tahun" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Call-to-Action (tombol) *</label>
              <input type="text" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} className="input mt-1 w-full text-sm" placeholder="contoh: Konsultasi Gratis" />
            </div>
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Target URL *</label>
              <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="input mt-1 w-full text-sm" placeholder="https://..." />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Slot Pemasangan *</label>
              <select value={slot} onChange={(e) => setSlot(e.target.value as AdSlot)} className="input mt-1 w-full text-sm">
                {SLOT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label} — {s.dim}px</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Style Hint</label>
              <select value={styleHint} onChange={(e) => setStyleHint(e.target.value)} className="input mt-1 w-full text-sm">
                {STYLE_PRESETS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-txt-secondary">Warna Brand (opsional, pisah koma)</label>
            <input type="text" value={brandColors} onChange={(e) => setBrandColors(e.target.value)} className="input mt-1 w-full text-sm" placeholder="contoh: #003366, #FFD700, #FFFFFF" />
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-txt-secondary">Catatan Tambahan (opsional)</label>
            <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={2} className="input mt-1 w-full text-sm" placeholder="Permintaan khusus dari klien..." maxLength={1000} />
          </div>

          <button
            onClick={handleGeneratePrompt}
            disabled={generating}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-base font-bold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Generate Prompt Claude Design
          </button>
        </div>
      )}

      {/* ─── STEP 2: Copy Prompt ─── */}
      {step === 2 && (
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-txt-primary">Step 2: Copy ke Claude Design</h2>
            <button onClick={() => setStep(1)} className="text-xs text-txt-secondary hover:text-txt-primary">← Edit Brief</button>
          </div>

          <div className="mb-4 rounded-[12px] border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
            <p className="font-semibold flex items-center gap-1"><AlertCircle size={14} /> Cara pakai:</p>
            <ol className="mt-1 list-decimal pl-5 space-y-0.5 text-xs">
              <li>Klik <strong>&ldquo;Copy Prompt&rdquo;</strong> di bawah</li>
              <li>Buka <a href="https://claude.ai/design" target="_blank" rel="noreferrer" className="underline font-semibold">claude.ai/design <ExternalLink size={10} className="inline" /></a></li>
              <li>Paste prompt di chat box</li>
              <li>Tunggu Claude Design generate (~30-60 detik)</li>
              <li>Download hasilnya (PNG/JPG)</li>
              <li>Klik <strong>&ldquo;Lanjut ke Upload&rdquo;</strong> di bawah</li>
            </ol>
            <p className="mt-2 text-xs">
              💡 <strong>Tip:</strong> Daily limit 15 routine runs/hari. Kalau hasilnya kurang oke, refine prompt langsung di Claude Design (cukup ngobrol biasa).
            </p>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-txt-secondary">Prompt ({recommendedDimensions})</span>
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${copied ? "bg-green-600 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}
            >
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Prompt</>}
            </button>
          </div>
          <textarea
            value={prompt}
            readOnly
            rows={20}
            className="input w-full font-mono text-xs leading-relaxed"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://claude.ai/design"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <ExternalLink size={14} /> Buka Claude Design
            </a>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Lanjut ke Upload <Upload size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Upload & Create Ad ─── */}
      {step === 3 && (
        <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-txt-primary">Step 3: Upload Design & Pasang Iklan</h2>
            <button onClick={() => setStep(2)} className="text-xs text-txt-secondary hover:text-txt-primary">← Lihat Prompt</button>
          </div>

          {/* Upload zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          {!uploadedUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-12 text-sm font-medium text-txt-secondary hover:border-purple-400 hover:text-purple-600 disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={18} /> Klik untuk upload design hasil dari Claude Design (PNG/JPG)</>
              )}
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <p className="mb-2 text-xs font-semibold text-txt-secondary">Design ter-upload:</p>
              <img src={uploadedUrl} alt="design" className="max-h-64 rounded border border-border bg-white" />
              <button
                onClick={() => { setUploadedUrl(""); fileInputRef.current?.click(); }}
                className="mt-2 text-xs text-purple-600 hover:underline"
                disabled={creating || !!createdAdId}
              >
                Ganti file
              </button>
            </div>
          )}

          {/* Schedule + priority */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-txt-secondary"><Calendar size={11} className="inline mr-1" /> Mulai Tayang</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mt-1 w-full text-sm" disabled={!!createdAdId} />
            </div>
            <div>
              <label className="text-xs font-semibold text-txt-secondary"><Calendar size={11} className="inline mr-1" /> Sampai</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input mt-1 w-full text-sm" disabled={!!createdAdId} />
            </div>
            <div>
              <label className="text-xs font-semibold text-txt-secondary">Priority (0-100)</label>
              <input type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} className="input mt-1 w-full text-sm" disabled={!!createdAdId} />
            </div>
          </div>

          {/* Preview info */}
          <div className="mt-4 rounded-lg bg-surface-secondary p-3 text-xs text-txt-secondary">
            <strong>Preview:</strong> Iklan untuk <strong className="text-txt-primary">{clientName}</strong>, slot <strong className="text-txt-primary">{slot}</strong> ({recommendedDimensions}), target → <code>{targetUrl}</code>
          </div>

          <button
            onClick={handleCreateAd}
            disabled={!uploadedUrl || creating || !!createdAdId}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-6 py-3 text-base font-bold text-white hover:bg-pink-700 disabled:opacity-40"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Megaphone size={18} />}
            {createdAdId ? "✓ Iklan Sudah Live" : "Pasang Iklan Sekarang"}
          </button>
        </div>
      )}
    </div>
  );
}

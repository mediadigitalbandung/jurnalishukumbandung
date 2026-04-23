"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  Music,
  Upload,
  Trash2,
  Loader2,
  Play,
  Pause,
} from "lucide-react";

interface Backsong {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  mood: string | null;
  license: string | null;
  createdAt: string;
}

const MOODS = ["netral", "serius", "dramatis", "santai", "urgent"];

export default function BacksongsPage() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [backsongs, setBacksongs] = useState<Backsong[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [formName, setFormName] = useState("");
  const [formMood, setFormMood] = useState<string>("netral");
  const [formLicense, setFormLicense] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tiktok/backsongs");
      const json = await res.json();
      if (json.success) setBacksongs(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Probe audio duration client-side
  const probeDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration || 0);
      });
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("audio/")) {
      showError("File harus berformat audio (mp3, m4a, wav)");
      return;
    }
    if (!formName.trim()) {
      showError("Isi nama backsong dulu");
      return;
    }

    setUploading(true);
    try {
      const duration = await probeDuration(file);
      if (!duration || duration < 1) {
        showError("Tidak bisa baca durasi audio");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "audio");
      const up = await fetch("/api/tiktok/upload", { method: "POST", body: fd });
      const upJson = await up.json();
      if (!up.ok || !upJson.success) {
        showError(upJson.error || "Upload gagal");
        return;
      }

      const create = await fetch("/api/tiktok/backsongs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          url: upJson.data.url,
          durationSec: duration,
          mood: formMood,
          license: formLicense.trim() || null,
        }),
      });
      const createJson = await create.json();
      if (!createJson.success) {
        showError(createJson.error || "Gagal simpan backsong");
        return;
      }

      success("Backsong ditambahkan");
      setFormName("");
      setFormLicense("");
      load();
    } catch {
      showError("Upload error");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const togglePlay = (b: Backsong) => {
    if (playingId === b.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const a = new Audio(b.url);
      a.play().catch(() => showError("Gagal putar"));
      a.addEventListener("ended", () => setPlayingId(null));
      audioRef.current = a;
      setPlayingId(b.id);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Hapus backsong",
      message: `Hapus "${name}"? Video yang pakai backsong ini akan tetap ada tapi tanpa backsong.`,
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tiktok/backsongs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Backsong dihapus");
        load();
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch {
      showError("Gagal hapus");
    }
    setDeletingId(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/panel/tiktok" className="mb-2 inline-flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary">
        <ArrowLeft size={12} /> Kembali ke TikTok
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-txt-primary">Library Backsong</h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Upload musik/audio pendek untuk dipakai sebagai backsong video TikTok. Pastikan lisensi OK (royalty-free / original).
      </p>

      {/* Upload form */}
      <div className="mb-6 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-txt-muted">Upload Backsong Baru</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs text-txt-secondary">Nama *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Dramatic Intro, Chill News, dll"
              className="input mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-txt-secondary">Mood</label>
            <select value={formMood} onChange={(e) => setFormMood(e.target.value)} className="input mt-1 w-full text-sm">
              {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-txt-secondary">Lisensi (opsional)</label>
            <input
              type="text"
              value={formLicense}
              onChange={(e) => setFormLicense(e.target.value)}
              placeholder="CC-BY, Pixabay, Bensound, dll"
              className="input mt-1 w-full text-sm"
            />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Pilih File Audio
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-pink-600" />
        </div>
      ) : backsongs.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface p-10 text-center shadow-card">
          <Music size={36} className="mx-auto mb-2 text-txt-muted" />
          <p className="text-sm text-txt-secondary">Belum ada backsong</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-[12px] border border-border bg-surface shadow-card">
          {backsongs.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4">
              <button
                onClick={() => togglePlay(b)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200"
              >
                {playingId === b.id ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1">
                <p className="text-sm font-semibold text-txt-primary">{b.name}</p>
                <p className="text-xs text-txt-muted">
                  {b.durationSec.toFixed(0)}s
                  {b.mood && <> · {b.mood}</>}
                  {b.license && <> · {b.license}</>}
                </p>
              </div>
              <button
                onClick={() => handleDelete(b.id, b.name)}
                disabled={deletingId === b.id}
                className="rounded-full border border-red-200 p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

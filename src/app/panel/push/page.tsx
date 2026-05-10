"use client";

import { useEffect, useState } from "react";
import { Send, Bell, History, Loader2 } from "lucide-react";

interface BroadcastLog {
  id: string;
  title: string;
  body: string;
  url: string | null;
  topic: string | null;
  totalSent: number;
  totalFailed: number;
  totalGone: number;
  createdAt: string;
}

interface Stats {
  totalSubscribers: number;
  recentBroadcasts: BroadcastLog[];
}

export default function PushBroadcastPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [url, setUrl]       = useState("");
  const [imageUrl, setImage] = useState("");
  const [topic, setTopic]   = useState("breaking");
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/push/stats", { cache: "no-store" });
      const json = await res.json();
      if (json?.success) setStats(json.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadStats(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          topic: topic.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json?.success) {
        setResult(`Terkirim ${json.data.totalSent} · Gagal ${json.data.totalFailed} · Hapus ${json.data.totalGone}`);
        setTitle(""); setBody(""); setUrl(""); setImage("");
        loadStats();
      } else {
        setResult(`Error: ${json?.error || "Unknown"}`);
      }
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container-main max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-txt-primary">
          <Bell className="text-goto-green" />
          Push Notifications
        </h1>
        <p className="mt-1 text-sm text-txt-secondary">
          Kirim notifikasi breaking news ke {stats?.totalSubscribers ?? "..."} pelanggan PWA.
        </p>
      </div>

      {/* Compose form */}
      <form onSubmit={handleSend} className="card mb-8 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Send className="h-4 w-4" />
          Susun Notifikasi
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              Judul (max 120 karakter) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Mis: BREAKING — Sidang putusan kasus korupsi BUMD Bandung"
              className="input w-full"
              required
            />
            <p className="mt-1 text-xs text-txt-muted">{title.length}/120</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              Isi pesan (max 500) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Mis: Hakim memvonis terdakwa 7 tahun penjara. Klik untuk baca putusan lengkap."
              className="input w-full"
              required
            />
            <p className="mt-1 text-xs text-txt-muted">{body.length}/500</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              URL tujuan (klik notif → buka URL ini)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://jurnalishukumbandung.com/berita/slug-artikel"
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              URL gambar (opsional, ditampilkan di notif Android)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://jurnalishukumbandung.com/uploads/foto.jpg"
              className="input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              Topik (kosongkan = kirim ke semua subscriber)
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input w-full"
            >
              <option value="">Semua subscriber</option>
              <option value="breaking">Breaking news</option>
              <option value="sidang">Update sidang</option>
              <option value="putusan">Putusan pengadilan</option>
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            {result && (
              <p className={`text-sm ${result.startsWith("Error") ? "text-red-600" : "text-goto-green"}`}>
                {result}
              </p>
            )}
            <button
              type="submit"
              disabled={sending || !title.trim() || !body.trim()}
              className="btn-primary ml-auto flex items-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Mengirim..." : "Kirim Notifikasi"}
            </button>
          </div>
        </div>
      </form>

      {/* Recent broadcasts */}
      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <History className="h-4 w-4" />
          Riwayat Broadcast
        </h2>
        {!stats || stats.recentBroadcasts.length === 0 ? (
          <p className="text-sm text-txt-secondary">Belum ada broadcast.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentBroadcasts.map((b) => (
              <div key={b.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-txt-primary">{b.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-txt-secondary">{b.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end text-xs">
                    <span className="font-semibold text-goto-green">✓ {b.totalSent}</span>
                    {b.totalFailed > 0 && <span className="text-red-500">✕ {b.totalFailed}</span>}
                    {b.totalGone > 0 && <span className="text-txt-muted">↻ {b.totalGone}</span>}
                  </div>
                </div>
                <p className="mt-2 text-xs text-txt-muted">
                  {new Date(b.createdAt).toLocaleString("id-ID")} {b.topic && `· #${b.topic}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

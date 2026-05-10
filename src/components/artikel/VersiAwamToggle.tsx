"use client";

import { useEffect, useState } from "react";
import { Sparkles, FileText, Loader2 } from "lucide-react";

interface Props {
  articleId: string;
  /** Original content rendered when toggle is OFF (with inline ads, server-rendered) */
  children: React.ReactNode;
  className?: string;
}

export default function VersiAwamToggle({ articleId, children, className = "" }: Props) {
  const [showAwam, setShowAwam]   = useState(false);
  const [versiAwam, setVersiAwam] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}/versi-awam`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data?.versiAwam) setVersiAwam(j.data.versiAwam);
      })
      .catch(() => {});
  }, [articleId]);

  async function ensureAwam(): Promise<boolean> {
    if (versiAwam) return true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/versi-awam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json?.success && json.data?.versiAwam) {
        setVersiAwam(json.data.versiAwam);
        return true;
      }
      setError(json?.error || "Gagal generate versi awam");
      return false;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(toAwam: boolean) {
    if (toAwam) {
      const ok = await ensureAwam();
      if (ok) setShowAwam(true);
    } else {
      setShowAwam(false);
    }
  }

  return (
    <div className={className}>
      {/* Toggle bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-secondary p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-goto-green" />
          <span className="text-sm font-semibold text-txt-primary">
            {showAwam ? "Versi Awam" : "Versi Lengkap"}
          </span>
          {showAwam && (
            <span className="rounded-full bg-goto-light px-2 py-0.5 text-[10px] font-semibold text-goto-dark">
              AI
            </span>
          )}
        </div>

        <div className="inline-flex items-center rounded-full border border-border bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            disabled={loading}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              !showAwam ? "bg-goto-green text-white" : "text-txt-secondary hover:text-goto-green"
            }`}
            aria-pressed={!showAwam}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Lengkap
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            disabled={loading}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              showAwam ? "bg-goto-green text-white" : "text-txt-secondary hover:text-goto-green"
            }`}
            aria-pressed={showAwam}
          >
            <span className="inline-flex items-center gap-1.5">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Awam
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Disclaimer when in Awam mode */}
      {showAwam && versiAwam && (
        <div className="mb-3 rounded-md border border-goto-light bg-goto-light/40 p-3 text-xs text-txt-secondary">
          <strong className="text-goto-dark">Catatan:</strong> Versi awam ditulis ulang oleh AI
          dengan bahasa lebih sederhana. Untuk keperluan resmi/hukum, baca{" "}
          <button
            type="button"
            onClick={() => setShowAwam(false)}
            className="font-semibold text-goto-green underline-offset-2 hover:underline"
          >
            versi lengkap
          </button>
          .
        </div>
      )}

      {/* Content area */}
      {showAwam && versiAwam ? (
        <div
          className="article-content text-base sm:text-[17px] leading-[1.8] break-words text-justify"
          dangerouslySetInnerHTML={{ __html: versiAwam }}
        />
      ) : (
        children
      )}
    </div>
  );
}

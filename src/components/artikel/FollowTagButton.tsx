"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  pushSupported,
  notificationPermission,
  subscribeToPush,
  getCurrentSubscription,
} from "@/lib/push-client";

interface Tag {
  name: string;
  slug: string;
}

interface Props {
  tags: Tag[];
  articleTitle?: string;
}

const STORAGE_KEY = "jhb-followed-tags";

function getFollowedTags(): string[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function setFollowedTags(slugs: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
}

export default function FollowTagButton({ tags }: Props) {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setFollowed(new Set(getFollowedTags()));
  }, []);

  if (!tags || tags.length === 0) return null;

  async function ensurePushSubscribed(allTopics: string[]): Promise<boolean> {
    if (!pushSupported()) {
      setError("Browser ini tidak mendukung notifikasi push.");
      return false;
    }
    if (notificationPermission() === "denied") {
      setError("Izin notifikasi diblokir. Ubah di pengaturan situs untuk mengaktifkan.");
      return false;
    }

    const topics = allTopics.map((slug) => `tag-${slug}`);
    const existing = await getCurrentSubscription();

    if (!existing) {
      // First-time subscribe with the new topics
      const r = await subscribeToPush(topics);
      if (!r.ok) {
        setError(r.reason === "permission-denied" ? "Anda menolak izin notifikasi." : "Gagal mendaftarkan notifikasi.");
        return false;
      }
      return true;
    }

    // Already subscribed — call /api/push/subscribe again with merged topics
    const sub = existing.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sub, topics }),
    });
    return res.ok;
  }

  async function toggleTag(slug: string) {
    setBusy(true);
    setError(null);

    const current = getFollowedTags();
    const isFollowing = current.includes(slug);
    const next = isFollowing
      ? current.filter((s) => s !== slug)
      : [...current, slug];

    setFollowedTags(next);
    setFollowed(new Set(next));

    // Sync push subscription topics
    if (next.length > 0) {
      const ok = await ensurePushSubscribed(next);
      if (!ok) {
        // Rollback if push subscription failed and this was a follow action
        if (!isFollowing) {
          setFollowedTags(current);
          setFollowed(new Set(current));
        }
      }
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-4">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4 text-goto-green" />
        <p className="text-sm font-semibold text-txt-primary">
          Ikuti perkembangan kasus
        </p>
      </div>
      <p className="mb-3 text-xs text-txt-secondary">
        Pilih topik di bawah untuk dapat notifikasi saat ada update artikel terkait.
      </p>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isFollowing = followed.has(tag.slug);
          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => toggleTag(tag.slug)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isFollowing
                  ? "border-goto-green bg-goto-green text-white hover:bg-goto-dark"
                  : "border-border bg-white text-txt-secondary hover:border-goto-green hover:text-goto-green"
              }`}
              aria-pressed={isFollowing}
              title={isFollowing ? `Berhenti ikuti #${tag.name}` : `Ikuti #${tag.name}`}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isFollowing ? (
                <BellOff className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3" />
              )}
              #{tag.name}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

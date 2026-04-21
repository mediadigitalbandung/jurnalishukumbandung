"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import type { Article } from "./types";
import { getTimeAgo } from "./types";

export default function RecentActivity({ articles }: { articles: Article[] }) {
  const activities = useMemo(() => {
    return [...articles]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8)
      .map((a) => {
        const actionMap: Record<string, { label: string; color: string; icon: string }> = {
          PUBLISHED: { label: "dipublikasikan", color: "text-goto-green", icon: "bg-goto-green" },
          IN_REVIEW: { label: "diajukan review", color: "text-yellow-600", icon: "bg-yellow-500" },
          APPROVED: { label: "disetujui", color: "text-blue-600", icon: "bg-blue-500" },
          REJECTED: { label: "ditolak", color: "text-red-600", icon: "bg-red-500" },
          DRAFT: { label: "disimpan sebagai draf", color: "text-txt-secondary", icon: "bg-gray-400" },
          ARCHIVED: { label: "diarsipkan", color: "text-txt-muted", icon: "bg-gray-500" },
        };
        const action = actionMap[a.status] || actionMap.DRAFT;
        const timeAgo = getTimeAgo(a.updatedAt);
        return { ...a, action, timeAgo };
      });
  }, [articles]);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-txt-primary">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
            <Clock size={14} className="text-blue-500" />
          </div>
          Aktivitas Terbaru
        </h2>
      </div>
      <div className="divide-y divide-border">
        {activities.length === 0 ? (
          <div className="p-5 text-center text-sm text-txt-muted">Belum ada aktivitas.</div>
        ) : (
          activities.map((a, i) => (
            <Link key={`${a.id}-${i}`} href={`/panel/artikel/${a.id}/edit`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-surface-secondary/50 transition-colors">
              <div className={`h-2 w-2 rounded-full ${a.action.icon}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-txt-primary truncate">{a.title}</p>
                <p className="text-xs text-txt-muted mt-0.5">
                  {a.author?.name || "—"} &middot; {a.timeAgo}
                </p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                a.action.color === "text-goto-green" ? "bg-goto-light text-goto-green" :
                a.action.color === "text-yellow-600" ? "bg-yellow-50 text-yellow-600" :
                a.action.color === "text-blue-600" ? "bg-blue-50 text-blue-600" :
                a.action.color === "text-red-600" ? "bg-red-50 text-red-600" :
                "bg-surface-tertiary text-txt-secondary"
              }`}>{a.action.label}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

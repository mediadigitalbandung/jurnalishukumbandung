"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { Article } from "./types";

export default function WeeklyArticleTrend({ articles }: { articles: Article[] }) {
  const weekData = useMemo(() => {
    const now = new Date();
    const days: { label: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });

      const count = articles.filter((a) => {
        const created = new Date(a.createdAt).toISOString().split("T")[0];
        return created === dayStr;
      }).length;

      days.push({ label, count });
    }
    return days;
  }, [articles]);

  const maxCount = Math.max(...weekData.map((d) => d.count), 1);
  const totalWeek = weekData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-txt-primary">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
            <BarChart3 size={14} className="text-blue-500" />
          </div>
          Aktivitas Mingguan
        </h2>
        <span className="text-xs text-txt-muted">{totalWeek} artikel</span>
      </div>
      <div className="p-5 space-y-2">
        {weekData.map((day, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-16 text-xs text-txt-secondary text-right shrink-0 font-medium">
              {day.label}
            </span>
            <div className="flex-1 h-5 bg-surface-secondary rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-goto-green to-goto-dark rounded-md transition-all duration-500 flex items-center justify-end pr-1.5"
                style={{ width: `${(day.count / maxCount) * 100}%`, minWidth: day.count > 0 ? "24px" : "0px" }}
              >
                {day.count > 0 && (
                  <span className="text-xs font-bold text-white">{day.count}</span>
                )}
              </div>
            </div>
            {day.count === 0 && (
              <span className="w-4 text-xs text-txt-muted text-right">0</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

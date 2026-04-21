"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import type { Article } from "./types";
import { formatNumber } from "./types";

export default function CategoryPerformance({ articles }: { articles: Article[] }) {
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; count: number; views: number }>();

    articles.forEach((a) => {
      const catName = a.category?.name || "Tanpa Kategori";
      const existing = map.get(catName) || { name: catName, count: 0, views: 0 };
      existing.count += 1;
      existing.views += a.viewCount || 0;
      map.set(catName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.views - a.views);
  }, [articles]);

  return (
    <div className="rounded-[12px] border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border bg-surface-secondary px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-txt-primary">
          <Layers size={18} className="text-blue-500" />
          Performa per Kategori
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary/50">
              <th scope="col" className="px-5 py-2.5 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">
                Kategori
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-xs font-semibold text-txt-muted uppercase tracking-wider">
                Artikel
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-xs font-semibold text-txt-muted uppercase tracking-wider">
                Total Views
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categoryData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-txt-secondary">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              categoryData.map((cat) => (
                <tr key={cat.name} className="hover:bg-surface-secondary/50">
                  <td className="px-5 py-2.5 font-medium text-txt-primary">{cat.name}</td>
                  <td className="px-5 py-2.5 text-right text-txt-secondary">{cat.count}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-gold">
                    {formatNumber(cat.views)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

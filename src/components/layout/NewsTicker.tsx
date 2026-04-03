"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";

interface TickerItem {
  title: string;
  slug: string;
}

interface NewsTickerProps {
  items: TickerItem[];
}

export default function NewsTicker({ items }: NewsTickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [paused, setPaused] = useState(false);
  const didDrag = useRef(false);

  if (!items.length) return null;

  const looped = [...items, ...items];

  // Mouse drag
  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.pageX;
    const el = trackRef.current;
    if (el) scrollLeft.current = el.scrollLeft;
    setPaused(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.pageX - startX.current;
    if (Math.abs(dx) > 3) didDrag.current = true;
    const el = trackRef.current;
    if (el) el.scrollLeft = scrollLeft.current - dx;
  }

  function onMouseUp() {
    isDragging.current = false;
    setPaused(false);
  }

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.touches[0].pageX;
    const el = trackRef.current;
    if (el) scrollLeft.current = el.scrollLeft;
    setPaused(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dx = e.touches[0].pageX - startX.current;
    if (Math.abs(dx) > 3) didDrag.current = true;
    const el = trackRef.current;
    if (el) el.scrollLeft = scrollLeft.current - dx;
  }

  function onTouchEnd() {
    isDragging.current = false;
    setPaused(false);
  }

  // Intercept click if dragged (prevent link navigation on drag)
  function onLinkClick(e: React.MouseEvent) {
    if (didDrag.current) e.preventDefault();
  }

  return (
    <div className="relative bg-surface border-b border-border overflow-hidden">
      <div className="flex items-center py-2 sm:py-2.5">
        {/* TRENDING label */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 border-r border-border mr-2">
          <span className="h-1.5 w-1.5 rounded-full bg-goto-green animate-pulse shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold tracking-widest text-goto-green uppercase whitespace-nowrap">
            Trending
          </span>
        </div>

        {/* Drag-scrollable ticker */}
        <div
          ref={trackRef}
          className="news-ticker flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{ animationPlayState: paused ? "paused" : undefined }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="news-ticker-content"
            style={{ animationPlayState: paused ? "paused" : "running" }}
          >
            {looped.map((item, i) => (
              <Link
                key={i}
                href={`/tag/${item.slug}`}
                onClick={onLinkClick}
                className="mx-6 sm:mx-10 inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-txt-primary/75 transition-colors duration-200 hover:text-goto-green whitespace-nowrap"
              >
                <span className="h-1 w-1 rounded-full bg-goto-green/50 shrink-0" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

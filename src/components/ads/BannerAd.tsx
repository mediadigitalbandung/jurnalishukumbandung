"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { sanitizeAdHtml } from "@/lib/sanitize";

interface Ad {
  id: string;
  type: string;
  imageUrl?: string | null;
  htmlCode?: string | null;
  targetUrl?: string | null;
}

const sizeToSlot: Record<string, string> = {
  slim: "HEADER",
  leaderboard: "BETWEEN_SECTIONS",
  billboard: "BETWEEN_SECTIONS",
  sidebar: "SIDEBAR",
  inline: "IN_ARTICLE",
};

interface BannerAdProps {
  size?: "leaderboard" | "billboard" | "sidebar" | "inline" | "slim";
  slot?: string;
  className?: string;
  noWrapper?: boolean;
}

/**
 * Returns ad only when container is near viewport (IntersectionObserver).
 * Avoids blocking LCP — below-fold ads don't fetch until user scrolls close.
 * containerRef needed so observer attaches to the wrapper div.
 */
function useAd(adSlot: string, containerRef: React.RefObject<HTMLElement>) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tracked = useRef(false);
  const fetched = useRef(false);

  // Setup IntersectionObserver on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // SSR or unsupported — fetch immediately
      setIsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            obs.disconnect();
            return;
          }
        }
      },
      { rootMargin: "300px 0px" } // start fetching ~300px before visible
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [containerRef]);

  // Fetch ad only after visible
  useEffect(() => {
    if (!isVisible || fetched.current) return;
    fetched.current = true;
    tracked.current = false;
    fetch(`/api/ads?slot=${adSlot}`)
      .then((r) => r.json())
      .then((json) => {
        const ads: Ad[] = json.data || [];
        if (ads.length > 0) {
          setAd(ads[Math.floor(Math.random() * ads.length)]);
        }
      })
      .catch(() => {});
  }, [isVisible, adSlot]);

  useEffect(() => {
    if (ad && !tracked.current) {
      tracked.current = true;
      fetch(`/api/ads/${ad.id}/track?type=impression`, { method: "POST" }).catch(() => {});
    }
  }, [ad]);

  return ad;
}

function handleClick(ad: Ad) {
  fetch(`/api/ads/${ad.id}/track?type=click`, { method: "POST" }).catch(() => {});
}

function AdContent({ ad }: { ad: Ad }) {
  const safeHtml = useMemo(
    () => (ad.type === "HTML" && ad.htmlCode ? sanitizeAdHtml(ad.htmlCode) : ""),
    [ad.type, ad.htmlCode]
  );
  const content =
    ad.type === "HTML" && safeHtml ? (
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    ) : ad.imageUrl ? (
      <Image
        src={ad.imageUrl}
        alt="Iklan"
        width={1200}
        height={300}
        className="w-full h-auto block"
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 1200px"
        unoptimized
      />
    ) : null;

  if (!content) return null;

  if (ad.targetUrl) {
    return (
      <a
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => handleClick(ad)}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function BannerAd({ size, slot, className = "", noWrapper }: BannerAdProps) {
  const adSlot = slot || (size ? sizeToSlot[size] : "HEADER");
  const containerRef = useRef<HTMLDivElement>(null);
  const ad = useAd(adSlot, containerRef);

  // Always render container (so observer can attach + measure layout space).
  // When ad not yet loaded, render minimal placeholder to avoid CLS.
  // Force rectangle (no rounded) on banner ads by overriding all descendant border-radius.
  // Pakai [&_*]:!rounded-none aggressive override agar HTML ad di DB yang punya rounded
  // tetap render rectangle sesuai design system.
  if (noWrapper) {
    return (
      <div ref={containerRef} className="min-h-[1px] [&_*]:!rounded-none">
        {ad ? <AdContent ad={ad} /> : null}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${className} [&_*]:!rounded-none`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {ad ? <AdContent ad={ad} /> : null}
      </div>
    </div>
  );
}

export function SidebarAd({ slot = "SIDEBAR" }: { slot?: string }) {
  const containerRef = useRef<HTMLElement>(null);
  const ad = useAd(slot, containerRef);
  const safeHtml = useMemo(
    () => (ad?.type === "HTML" && ad.htmlCode ? sanitizeAdHtml(ad.htmlCode) : ""),
    [ad?.type, ad?.htmlCode]
  );

  // Always render container with ref so IntersectionObserver fires
  if (!ad) {
    return <div ref={containerRef as React.RefObject<HTMLDivElement>} className="block w-full min-h-[1px]" aria-hidden="true" />;
  }

  const content =
    ad.type === "HTML" && safeHtml ? (
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} className="w-full h-full" />
    ) : ad.imageUrl ? (
      <Image
        src={ad.imageUrl}
        alt="Iklan"
        width={300}
        height={600}
        className="w-full h-full object-contain object-top block rounded-lg"
        loading="lazy"
        sizes="300px"
        unoptimized
      />
    ) : null;

  if (!content) return <div ref={containerRef as React.RefObject<HTMLDivElement>} className="block w-full min-h-[1px]" aria-hidden="true" />;

  const wrapperClass = "block w-full h-full rounded-lg overflow-hidden bg-[#0f1210]";

  if (ad.targetUrl) {
    return (
      <a
        ref={containerRef as React.RefObject<HTMLAnchorElement>}
        href={ad.targetUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => handleClick(ad)}
        className={wrapperClass}
      >
        {content}
      </a>
    );
  }

  return <div ref={containerRef as React.RefObject<HTMLDivElement>} className={wrapperClass}>{content}</div>;
}

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

function useAd(adSlot: string) {
  const [ad, setAd] = useState<Ad | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
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
  }, [adSlot]);

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
  const ad = useAd(adSlot);

  if (!ad) return null;

  if (noWrapper) {
    return <AdContent ad={ad} />;
  }

  return (
    <div className={className}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <AdContent ad={ad} />
      </div>
    </div>
  );
}

export function SidebarAd({ slot = "SIDEBAR" }: { slot?: string }) {
  const ad = useAd(slot);
  const safeHtml = useMemo(
    () => (ad?.type === "HTML" && ad.htmlCode ? sanitizeAdHtml(ad.htmlCode) : ""),
    [ad?.type, ad?.htmlCode]
  );

  if (!ad) return null;

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

  if (!content) return null;

  const wrapperClass = "block w-full h-full rounded-lg overflow-hidden bg-[#0f1210]";

  if (ad.targetUrl) {
    return (
      <a
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

  return <div className={wrapperClass}>{content}</div>;
}

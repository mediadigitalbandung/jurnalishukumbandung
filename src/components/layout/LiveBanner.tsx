import Link from "next/link";
import { Radio } from "lucide-react";

import { prisma } from "@/lib/prisma";

/**
 * Global LIVE banner — rendered above PublicNav in every page.
 * Server component: queries the latest LIVE session and renders a sticky
 * red bar so visitors on ANY page (homepage, article detail, kategori, etc.)
 * immediately know there's an active broadcast.
 *
 * Returns null when no public LIVE session exists.
 */
export default async function LiveBanner() {
  let session: {
    title: string;
    slug: string;
    currentViewers: number;
    broadcaster: { name: string };
  } | null = null;

  try {
    session = await prisma.liveSession.findFirst({
      where: { status: "LIVE", isPublic: true },
      orderBy: { startedAt: "desc" },
      select: {
        title: true,
        slug: true,
        currentViewers: true,
        broadcaster: { select: { name: true } },
      },
    });
  } catch {
    // Don't break the page if DB is briefly unreachable
    return null;
  }

  if (!session) return null;

  return (
    <Link
      href={`/live/${session.slug}`}
      aria-label={`Tonton siaran langsung: ${session.title}`}
      className="group relative block w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white shadow-sm hover:from-red-800 hover:via-red-700 hover:to-red-800 transition-colors"
    >
      <div className="container-main flex items-center gap-3 py-2 sm:py-2.5">
        {/* LIVE pulse badge */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/30">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Live
        </span>

        {/* Title + broadcaster */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold leading-tight sm:text-base">
            <Radio
              size={14}
              className="mr-1.5 inline-block align-text-bottom"
              aria-hidden="true"
            />
            {session.title}
          </p>
          <p className="truncate text-[11px] text-white/80 sm:text-xs">
            oleh {session.broadcaster.name}
            {session.currentViewers > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-white/60" />
                {session.currentViewers.toLocaleString("id-ID")} menonton
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700 shadow-sm transition-transform group-hover:scale-105">
          Tonton →
        </span>
        <span className="inline-flex sm:hidden shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-red-700">
          Tonton →
        </span>
      </div>
    </Link>
  );
}

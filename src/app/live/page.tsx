export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { Radio, Calendar, PlayCircle, Eye, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Live Streaming | Jurnalis Hukum Bandung",
  description:
    "Tonton siaran langsung sidang, konferensi pers, dan diskusi hukum dari Bandung & Jawa Barat. Recording lengkap juga tersedia.",
  alternates: { canonical: "https://jurnalishukumbandung.com/live" },
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(s: number | null): string {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default async function LiveArchivePage() {
  const [live, scheduled, archived] = await Promise.all([
    prisma.liveSession.findMany({
      where: { status: "LIVE", isPublic: true },
      orderBy: { startedAt: "desc" },
      include: {
        broadcaster: { select: { name: true, avatar: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.liveSession.findMany({
      where: { status: "SCHEDULED", isPublic: true, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      include: { broadcaster: { select: { name: true } }, category: { select: { name: true } } },
    }),
    prisma.liveSession.findMany({
      where: { status: "ARCHIVED", isPublic: true },
      orderBy: { endedAt: "desc" },
      take: 50,
      include: {
        broadcaster: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return (
    <div className="container-main py-8 space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-txt-primary flex items-center gap-3">
          <Radio className="h-8 w-8 text-red-600" />
          Live Streaming
        </h1>
        <p className="text-txt-secondary mt-2">
          Siaran langsung sidang, press conference, & diskusi hukum dari Bandung & Jawa Barat. Recording tersedia setelah live selesai.
        </p>
      </header>

      {/* SEDANG LIVE */}
      {live.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-txt-primary mb-4 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
            Sedang Live ({live.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {live.map((s) => (
              <Link
                key={s.id}
                href={`/live/${s.slug}`}
                className="card overflow-hidden hover:shadow-lg transition group"
              >
                <div className="aspect-video bg-gradient-to-br from-red-100 to-pink-50 relative overflow-hidden">
                  {s.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Radio className="h-12 w-12 text-red-400" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full" />
                    LIVE
                  </span>
                  {s.currentViewers > 0 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      <Eye className="h-3 w-3" />
                      {s.currentViewers}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-txt-primary line-clamp-2 group-hover:text-goto-green transition">
                    {s.title}
                  </h3>
                  <div className="text-xs text-txt-muted mt-2">
                    {s.broadcaster.name}
                    {s.category && <span> · {s.category.name}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DIJADWALKAN */}
      {scheduled.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-txt-primary mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Akan Datang ({scheduled.length})
          </h2>
          <div className="space-y-2">
            {scheduled.map((s) => (
              <Link
                key={s.id}
                href={`/live/${s.slug}`}
                className="card p-4 flex items-center gap-4 hover:shadow-md transition"
              >
                <div className="w-14 h-14 rounded-lg bg-blue-50 text-blue-700 flex flex-col items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-txt-primary line-clamp-1">{s.title}</h3>
                  <div className="text-sm text-txt-secondary mt-0.5">
                    {formatDate(s.scheduledAt)} · {s.broadcaster.name}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ARCHIVED */}
      <section>
        <h2 className="text-xl font-bold text-txt-primary mb-4 flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-goto-green" />
          Recording Tersedia ({archived.length})
        </h2>
        {archived.length === 0 ? (
          <div className="card p-10 text-center text-txt-secondary">
            Belum ada recording. Recording akan muncul di sini setelah live session selesai.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {archived.map((s) => (
              <Link
                key={s.id}
                href={`/live/${s.slug}`}
                className="card overflow-hidden hover:shadow-lg transition group"
              >
                <div className="aspect-video bg-surface-secondary relative overflow-hidden">
                  {s.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayCircle className="h-14 w-14 text-txt-muted" />
                    </div>
                  )}
                  {s.recordingDuration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(s.recordingDuration)}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-txt-primary line-clamp-2 group-hover:text-goto-green transition">
                    {s.title}
                  </h3>
                  <div className="text-xs text-txt-muted mt-2 flex justify-between">
                    <span>{formatDate(s.startedAt || s.endedAt)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {s.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

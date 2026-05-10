export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Eye, Calendar, Radio, Clock, User, ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildHlsUrl } from "@/lib/live";
import LiveWatchClient from "./watch-client";
import { toJakartaISO } from "@/lib/utils";

async function getSession(slug: string) {
  return await prisma.liveSession.findUnique({
    where: { slug },
    include: {
      broadcaster: { select: { id: true, name: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const session = await getSession(params.slug);
  if (!session) return { title: "Live Tidak Ditemukan" };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  const isLive = session.status === "LIVE";
  const title = session.seoTitle || session.title;
  const description =
    session.seoDescription ||
    session.description?.slice(0, 200) ||
    `${isLive ? "Sedang Live: " : "Tonton: "}${session.title}`;

  return {
    title: isLive ? `🔴 LIVE: ${title}` : `${title} | Jurnalis Hukum Bandung`,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      url: `${appUrl}/live/${params.slug}`,
      siteName: "Jurnalis Hukum Bandung",
      images: session.thumbnail ? [{ url: session.thumbnail, width: 1200, height: 630 }] : [],
    },
    alternates: { canonical: `${appUrl}/live/${params.slug}` },
    robots: { index: session.isPublic, follow: session.isPublic },
  };
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(s: number | null): string {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export default async function LiveWatchPage({ params }: { params: { slug: string } }) {
  const session = await getSession(params.slug);
  if (!session) notFound();
  if (!session.isPublic) {
    // Private — redirect ke not-found untuk publik
    notFound();
  }

  const isLive = session.status === "LIVE";
  const isArchived = session.status === "ARCHIVED" && !!session.recordingUrl;
  const isScheduled = session.status === "SCHEDULED";
  const isEnded = session.status === "ENDED" && !session.recordingUrl;
  const playerSrc = isLive ? buildHlsUrl(session.streamKey) : session.recordingUrl || "";

  return (
    <div className="container-main py-6">
      <Link href="/live" className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-goto-green mb-3">
        <ChevronLeft className="h-4 w-4" /> Semua Live
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column — player + info */}
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-txt-primary flex items-start gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded mt-2 animate-pulse flex-shrink-0">
                <span className="w-2 h-2 bg-white rounded-full" />
                LIVE
              </span>
            )}
            <span>{session.title}</span>
          </h1>

          {/* Player or placeholder */}
          {(isLive || isArchived) && playerSrc ? (
            <LiveWatchClient
              sessionId={session.id}
              slug={session.slug}
              initialStatus={session.status}
              src={playerSrc}
              poster={session.thumbnail || undefined}
              isLive={isLive}
            />
          ) : isScheduled ? (
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 rounded-[12px] flex flex-col items-center justify-center text-center p-6">
              <Calendar className="h-12 w-12 text-blue-600 mb-3" />
              <div className="text-xl font-semibold text-blue-900">Dijadwalkan</div>
              <div className="text-blue-700 mt-1">{formatDate(session.scheduledAt)}</div>
              <div className="text-sm text-blue-600 mt-2">Refresh halaman saat live mulai</div>
            </div>
          ) : isEnded ? (
            <div className="aspect-video bg-gray-100 rounded-[12px] flex flex-col items-center justify-center text-center p-6">
              <Clock className="h-12 w-12 text-gray-500 mb-3" />
              <div className="text-xl font-semibold text-gray-700">Live Selesai</div>
              <div className="text-gray-600 mt-1">Recording sedang diproses, akan tersedia dalam beberapa menit</div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-900 rounded-[12px] flex flex-col items-center justify-center text-center p-6">
              <Radio className="h-12 w-12 text-gray-500 mb-3" />
              <div className="text-white">Stream tidak tersedia</div>
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div className="card p-5">
              <h2 className="font-semibold mb-2 text-txt-primary">Tentang Siaran Ini</h2>
              <p className="text-txt-secondary whitespace-pre-line text-sm leading-relaxed">{session.description}</p>
            </div>
          )}

          {/* Related article */}
          {session.relatedArticleId && (
            <div className="card p-4 border-l-4 border-goto-green">
              <div className="text-xs text-txt-secondary mb-1">Artikel Terkait</div>
              <Link
                href={`/berita/${session.relatedArticleId}`}
                className="text-goto-green hover:underline font-medium"
              >
                Baca artikel terkait →
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar — meta */}
        <aside className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                {session.broadcaster.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.broadcaster.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-txt-muted" />
                )}
              </div>
              <div>
                <div className="text-xs text-txt-secondary">Broadcaster</div>
                <div className="font-semibold text-txt-primary">{session.broadcaster.name}</div>
              </div>
            </div>
            {session.category && (
              <div className="text-sm">
                <span className="text-txt-secondary">Kategori: </span>
                <Link href={`/kategori/${session.category.slug}`} className="text-goto-green hover:underline">
                  {session.category.name}
                </Link>
              </div>
            )}
          </div>

          <div className="card p-5 space-y-2 text-sm">
            {isLive && (
              <div className="flex justify-between">
                <span className="text-txt-secondary">Mulai</span>
                <span className="font-medium">{formatDate(session.startedAt)}</span>
              </div>
            )}
            {isScheduled && session.scheduledAt && (
              <div className="flex justify-between">
                <span className="text-txt-secondary">Jadwal</span>
                <span className="font-medium">{formatDate(session.scheduledAt)}</span>
              </div>
            )}
            {(isArchived || isEnded) && (
              <>
                <div className="flex justify-between">
                  <span className="text-txt-secondary">Tanggal</span>
                  <span className="font-medium">{formatDate(session.startedAt)}</span>
                </div>
                {session.recordingDuration && (
                  <div className="flex justify-between">
                    <span className="text-txt-secondary">Durasi</span>
                    <span className="font-medium">{formatDuration(session.recordingDuration)}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-txt-secondary">Total ditonton</span>
              <span className="font-medium flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {session.viewCount.toLocaleString("id-ID")}
              </span>
            </div>
            {session.peakViewers > 0 && (
              <div className="flex justify-between">
                <span className="text-txt-secondary">Peak viewer</span>
                <span className="font-medium">{session.peakViewers.toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          {/* JSON-LD VideoObject */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": isLive ? "BroadcastEvent" : "VideoObject",
                name: session.title,
                description: session.description || session.title,
                uploadDate: toJakartaISO(session.startedAt || session.createdAt),
                ...(session.thumbnail ? { thumbnailUrl: session.thumbnail } : {}),
                ...(isLive
                  ? { isLiveBroadcast: true, startDate: toJakartaISO(session.startedAt) }
                  : {}),
                ...(session.recordingUrl ? { contentUrl: session.recordingUrl } : {}),
              }),
            }}
          />
        </aside>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Calendar, MapPin, Gavel, Radio, Clock, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Jadwal Sidang Pengadilan Bandung Hari Ini — Jurnalis Hukum Bandung",
  description: "Jadwal sidang pengadilan di Bandung dan Jawa Barat hari ini. Info sidang tipikor, pidana, perdata, agama, dan TUN lengkap dengan agenda, hakim, dan lokasi.",
  keywords: ["jadwal sidang bandung", "sidang pengadilan bandung hari ini", "jadwal sidang tipikor bandung", "pengadilan negeri bandung", "sidang hari ini bandung"],
  alternates: { canonical: "/jadwal-sidang" },
};

const courtTypeLabels: Record<string, string> = {
  umum: "Pidana/Perdata",
  tipikor: "Tipikor",
  militer: "Militer",
  agama: "Agama",
  tun: "TUN",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Dijadwalkan", color: "bg-blue-50 text-blue-700 border-blue-200" },
  live: { label: "Sedang Berlangsung", color: "bg-red-50 text-red-700 border-red-200" },
  done: { label: "Selesai", color: "bg-gray-50 text-gray-600 border-gray-200" },
  postponed: { label: "Ditunda", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

export default async function JadwalSidangPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [todaySchedules, upcomingSchedules] = await Promise.all([
    prisma.courtSchedule.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      orderBy: [{ isHighlight: "desc" }, { date: "asc" }],
    }),
    prisma.courtSchedule.findMany({
      where: { date: { gte: tomorrow, lte: nextWeek } },
      orderBy: [{ date: "asc" }, { isHighlight: "desc" }],
      take: 20,
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

  return (
    <div className="bg-surface min-h-screen">
      {/* Structured Data — Event schema for court schedules */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Jadwal Sidang Pengadilan Bandung",
            description: "Jadwal sidang pengadilan di Bandung dan Jawa Barat hari ini",
            url: `${baseUrl}/jadwal-sidang`,
            numberOfItems: todaySchedules.length + upcomingSchedules.length,
            itemListElement: todaySchedules.slice(0, 10).map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Event",
                name: s.title,
                startDate: s.date.toISOString(),
                location: {
                  "@type": "Place",
                  name: s.court,
                  address: { "@type": "PostalAddress", addressLocality: "Bandung", addressRegion: "Jawa Barat" },
                },
                description: [s.agenda, s.defendant ? `Terdakwa: ${s.defendant}` : null].filter(Boolean).join(". "),
              },
            })),
          }),
        }}
      />

      <div className="container-main py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-txt-muted">
          <Link href="/" className="hover:text-goto-green">Beranda</Link>
          <ChevronRight size={14} />
          <span className="font-medium text-txt-primary">Jadwal Sidang</span>
        </nav>

        <div className="mb-8">
          <h1 className="flex items-center gap-3 font-serif text-2xl font-bold text-txt-primary sm:text-3xl">
            <Gavel size={28} className="text-goto-green" />
            Jadwal Sidang Pengadilan Bandung
          </h1>
          <p className="mt-2 text-sm text-txt-muted">
            Informasi jadwal sidang pengadilan di Bandung dan Jawa Barat — diperbarui setiap hari
          </p>
        </div>

        {/* Today */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-goto-green pl-3 font-serif text-lg font-bold text-txt-primary">
            <Calendar size={18} className="text-goto-green" />
            Hari Ini — {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>

          {todaySchedules.length === 0 ? (
            <div className="rounded-[12px] border-2 border-dashed border-border py-12 text-center">
              <AlertCircle size={32} className="mx-auto text-txt-muted mb-3" />
              <p className="text-txt-muted">Belum ada jadwal sidang untuk hari ini</p>
              <p className="mt-1 text-xs text-txt-muted">Jadwal dikelola oleh redaksi</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todaySchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-goto-green pl-3 font-serif text-lg font-bold text-txt-primary">
            <Clock size={18} className="text-goto-green" />
            Minggu Ini
          </h2>

          {upcomingSchedules.length === 0 ? (
            <div className="rounded-[12px] border-2 border-dashed border-border py-8 text-center">
              <p className="text-txt-muted text-sm">Belum ada jadwal minggu ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((s) => (
                <div key={s.id} className="flex items-start gap-4 rounded-[12px] border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="shrink-0 text-center">
                    <div className="text-2xl font-bold text-goto-green">{new Date(s.date).getDate()}</div>
                    <div className="text-[10px] uppercase text-txt-muted">
                      {new Date(s.date).toLocaleDateString("id-ID", { month: "short" })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="text-sm font-bold text-txt-primary leading-snug">{s.title}</h3>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusLabels[s.status]?.color || ""}`}>
                        {s.status === "live" && <Radio size={8} className="mr-1 animate-pulse" />}
                        {statusLabels[s.status]?.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-txt-secondary">
                      <span className="flex items-center gap-1"><Gavel size={11} />{s.court}</span>
                      {s.time && <span className="flex items-center gap-1"><Clock size={11} />{s.time}</span>}
                      {s.location && <span className="flex items-center gap-1"><MapPin size={11} />{s.location}</span>}
                    </div>
                    {s.defendant && <p className="mt-1 text-xs text-txt-muted">Terdakwa: {s.defendant}</p>}
                    {s.agenda && <p className="mt-0.5 text-xs text-txt-muted">Agenda: {s.agenda}</p>}
                  </div>
                  {s.articleSlug && (
                    <Link href={`/berita/${s.articleSlug}`} className="shrink-0 text-xs font-medium text-goto-green hover:underline">
                      Liputan →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ScheduleCard({ schedule: s }: { schedule: { id: string; title: string; court: string; courtType: string; time: string | null; location: string | null; defendant: string | null; agenda: string | null; status: string; isHighlight: boolean; articleSlug: string | null; caseNumber: string | null } }) {
  const st = statusLabels[s.status] || statusLabels.scheduled;

  return (
    <div className={`rounded-[12px] border bg-surface p-5 shadow-card transition-shadow hover:shadow-card-hover ${s.isHighlight ? "border-goto-green ring-1 ring-goto-green/20" : "border-border"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-0.5 text-[10px] font-semibold text-txt-secondary uppercase tracking-wider">
          {courtTypeLabels[s.courtType] || s.courtType}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
          {s.status === "live" && <Radio size={8} className="mr-1 animate-pulse" />}
          {st.label}
        </span>
      </div>

      <h3 className="text-sm font-bold text-txt-primary leading-snug mb-2">{s.title}</h3>

      <div className="space-y-1 text-xs text-txt-secondary">
        <div className="flex items-center gap-1.5"><Gavel size={12} className="text-goto-green" />{s.court}</div>
        {s.time && <div className="flex items-center gap-1.5"><Clock size={12} className="text-goto-green" />{s.time}</div>}
        {s.location && <div className="flex items-center gap-1.5"><MapPin size={12} className="text-goto-green" />{s.location}</div>}
      </div>

      {s.defendant && <p className="mt-2 text-xs text-txt-muted">Terdakwa: <span className="font-medium text-txt-secondary">{s.defendant}</span></p>}
      {s.agenda && <p className="mt-1 text-xs text-txt-muted">Agenda: {s.agenda}</p>}
      {s.caseNumber && <p className="mt-1 text-[10px] text-txt-muted font-mono">{s.caseNumber}</p>}

      {s.articleSlug && (
        <Link href={`/berita/${s.articleSlug}`} className="mt-3 inline-flex items-center text-xs font-semibold text-goto-green hover:underline">
          Baca Liputan →
        </Link>
      )}
    </div>
  );
}

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offline — Tanpa Koneksi | Jurnalis Hukum Bandung",
  description:
    "Anda sedang offline. Akses artikel hukum Bandung yang sudah tersimpan untuk dibaca tanpa koneksi internet.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/offline" },
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}

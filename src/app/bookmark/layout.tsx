import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bookmark — Artikel Tersimpan | Jurnalis Hukum Bandung",
  description:
    "Daftar artikel hukum yang Anda simpan untuk dibaca offline atau nanti. Akses berita hukum Bandung favorit kapan saja.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/bookmark" },
};

export default function BookmarkLayout({ children }: { children: React.ReactNode }) {
  return children;
}

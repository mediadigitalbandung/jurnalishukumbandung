import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pasang Aplikasi JHB | Jurnalis Hukum Bandung",
  description: "Pasang aplikasi Jurnalis Hukum Bandung di perangkat Anda untuk baca berita hukum lebih cepat, offline, dan dapat notifikasi breaking news. Gratis, tanpa daftar.",
  alternates: {
    canonical: "https://jurnalishukumbandung.com/install",
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}

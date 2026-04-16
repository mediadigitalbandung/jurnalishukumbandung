import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description: "Hubungi redaksi Jurnalis Hukum Bandung untuk pertanyaan, saran, atau kerja sama.",
  alternates: { canonical: "https://jurnalishukumbandung.com/kontak" },
};

export default function KontakLayout({ children }: { children: React.ReactNode }) {
  return children;
}

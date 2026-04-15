import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cari Berita",
  description: "Cari berita hukum di Jurnalis Hukum Bandung.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}

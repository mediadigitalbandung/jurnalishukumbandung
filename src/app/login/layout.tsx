import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk — Panel Redaksi | Jurnalis Hukum Bandung",
  description:
    "Halaman login untuk redaksi & kontributor Jurnalis Hukum Bandung. Hanya untuk pengguna terdaftar.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  X,
  Search,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  Bookmark,
} from "lucide-react";

const categoryNavMain = [
  { name: "Terkini", href: "/" },
  { name: "Hukum Pidana", href: "/kategori/hukum-pidana" },
  { name: "Hukum Perdata", href: "/kategori/hukum-perdata" },
  { name: "Tata Negara", href: "/kategori/hukum-tata-negara" },
  { name: "HAM", href: "/kategori/ham" },
  { name: "Hukum Bisnis", href: "/kategori/hukum-bisnis" },
  { name: "Opini", href: "/kategori/opini" },
  { name: "Daerah", href: "/kategori/berita-bandung" },
];

const categoryNavMore = [
  { name: "Lingkungan", href: "/kategori/hukum-lingkungan" },
  { name: "Ketenagakerjaan", href: "/kategori/ketenagakerjaan" },
  { name: "Infografis", href: "/kategori/infografis" },
  { name: "Hukum Administrasi", href: "/kategori/hukum-administrasi" },
  { name: "Koreksi & Klarifikasi", href: "/kode-etik" },
];

// All mobile categories combined from main + more (no duplicates needed)

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      // Only toggle if scrolled past threshold with hysteresis to prevent flickering
      if (y > 150 && y > lastY) {
        setScrolled(true);
      } else if (y < 100) {
        setScrolled(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Row 1: Top bar — sticky dark header */}
      <header className="sticky top-0 z-50 bg-surface-dark" role="banner" aria-label="Header utama">
        <div className="container-main">
          {/* Row 1: Logo + date + actions */}
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <Link href="/" className="group flex shrink-0 items-center gap-2.5">
              <Image
                src="/logo-jhb.png"
                alt="Jurnalis Hukum Bandung"
                width={96}
                height={96}
                className="h-9 w-9 sm:h-12 sm:w-12 object-contain"
                quality={100}
                priority
              />
              <span className="flex items-baseline gap-1 sm:gap-2">
                <span className="text-sm font-bold text-white sm:text-2xl lg:text-3xl">
                  Jurnalis Hukum
                </span>
                <span className="text-[10px] text-white/50 sm:text-base lg:text-xl">Bandung</span>
              </span>
            </Link>

            {/* Right: Date + Search (desktop) + actions */}
            <div className="flex items-center gap-3">
            {/* Live date */}
            <span className="hidden text-xs text-white/40 md:block">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            <div className="hidden h-5 w-px bg-white/20 md:block" />
            {/* Search — hidden on mobile, shown inline on md+ */}
            <form action="/search" className="relative hidden md:block md:w-64 lg:w-80" role="search" aria-label="Pencarian artikel">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                placeholder="Cari di sini..."
                aria-label="Cari artikel"
                className="w-full rounded-full border border-border bg-white py-2 pl-10 pr-4 text-sm text-txt-primary placeholder:text-txt-muted transition-all focus:border-goto-green focus:outline-none focus:ring-2 focus:ring-goto-green/20"
              />
            </form>

              {/* Bookmark link */}
              <Link
                href="/bookmark"
                className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white hover:bg-white/10"
                title="Bookmark Saya"
              >
                <Bookmark size={14} />
                <span className="hidden lg:inline">Bookmark</span>
              </Link>

              {/* User area */}
              {session ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-goto-green text-xs font-bold text-white transition-opacity hover:opacity-90"
                    aria-label="Menu pengguna"
                    aria-expanded={userMenuOpen}
                  >
                    {session.user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </button>
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded border border-border bg-surface py-1 shadow-lg">
                        <div className="border-b border-border px-4 py-2.5">
                          <p className="text-sm font-medium text-txt-primary">
                            {session.user?.name || "User"}
                          </p>
                        </div>
                        <Link
                          href="/panel/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-txt-secondary transition-colors hover:bg-surface-secondary hover:text-goto-green"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard size={14} />
                          Panel
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-txt-secondary transition-colors hover:bg-surface-secondary hover:text-goto-green"
                        >
                          <LogOut size={14} />
                          Keluar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white lg:hidden"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          {/* Mobile search bar — smooth hide on scroll */}
          <div className={`overflow-hidden md:hidden transition-all duration-500 ease-in-out ${scrolled || mobileMenuOpen ? "max-h-0 pb-0 opacity-0 -translate-y-2" : "max-h-14 pb-3 opacity-100 translate-y-0"}`}>
            <form action="/search" className="relative" role="search" aria-label="Pencarian artikel (mobile)">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                name="q"
                placeholder="Cari di sini..."
                aria-label="Cari artikel"
                className="w-full rounded-full border border-border bg-white py-2 pl-10 pr-4 text-sm text-txt-primary placeholder:text-txt-muted transition-all focus:border-goto-green focus:outline-none focus:ring-2 focus:ring-goto-green/20"
              />
            </form>
          </div>
        </div>
      </header>

      {/* Row 2: Category navigation — prominent white bar */}
      <nav className="bg-surface border-b border-border relative" aria-label="Navigasi kategori">
        <div className="container-main">
          <ul className="flex items-center gap-1 overflow-x-auto scrollbar-hide lg:justify-between lg:gap-0">
            {categoryNavMain.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className={`relative inline-block px-3 py-2.5 text-sm sm:text-base font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "text-goto-green after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-goto-green"
                      : "text-txt-primary hover:text-goto-green"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
              );
            })}
            {/* Lainnya dropdown */}
            <li className="relative shrink-0">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="inline-flex items-center gap-1 px-3 py-2.5 text-sm sm:text-base font-semibold text-txt-secondary hover:text-goto-green transition-colors whitespace-nowrap"
                aria-label="Kategori lainnya"
                aria-expanded={moreOpen}
              >
                Lainnya
                <ChevronRight size={14} className={`transition-transform duration-200 ${moreOpen ? "rotate-90" : ""}`} />
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-0 w-52 rounded-lg border border-border bg-surface py-1 shadow-lg">
                    {categoryNavMore.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-txt-primary hover:bg-surface-secondary hover:text-goto-green transition-colors"
                        onClick={() => setMoreOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile slide-in panel */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop — dark overlay */}
        <div
          className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-surface transition-transform duration-300 ease-out shadow-2xl ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Mobile header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-bold text-txt-primary">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded p-1.5 text-txt-secondary transition-colors hover:bg-surface-secondary hover:text-txt-primary"
              aria-label="Tutup menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile nav items */}
          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: "calc(100vh - 130px)" }}>
            <div className="px-3 py-2">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-txt-muted">
                Kategori
              </span>
            </div>
            <ul className="space-y-0.5 px-3 pb-3">
              {[...categoryNavMain, ...categoryNavMore].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium text-txt-primary transition-colors hover:bg-surface-secondary hover:text-goto-green"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                    <ChevronRight size={16} className="text-txt-muted" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Bookmark link in mobile menu */}
            <div className="px-3 py-2">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-txt-muted">
                Lainnya
              </span>
            </div>
            <ul className="space-y-0.5 px-3 pb-3">
              <li>
                <Link
                  href="/bookmark"
                  className="flex items-center gap-2 rounded px-3 py-2.5 text-sm font-medium text-txt-primary transition-colors hover:bg-surface-secondary hover:text-goto-green"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bookmark size={16} className="text-goto-green" />
                  Bookmark Saya
                </Link>
              </li>
            </ul>
          </div>

          {/* Mobile footer */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-border px-5 py-4">
            <span className="block text-center text-xs text-txt-muted">
              Jurnalis Hukum Bandung
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Apple,
  Chrome,
  WifiOff,
  Bell,
  Bookmark as BookmarkIcon,
  Zap,
  ArrowLeft,
  Share2,
  Plus,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

type Platform = "ios-safari" | "android-chrome" | "desktop-chrome" | "desktop-firefox" | "desktop-safari" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
  const isFirefox = /firefox|fxios/.test(ua);
  const isChrome = /chrome|crios/.test(ua) && !/edge|edg/.test(ua);

  if (isIos && isSafari) return "ios-safari";
  if (isAndroid && isChrome) return "android-chrome";
  if (isChrome) return "desktop-chrome";
  if (isFirefox) return "desktop-firefox";
  if (isSafari) return "desktop-safari";
  return "other";
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "no-update" | "updating" | "updated">("idle");
  const [swVersion, setSwVersion] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneMode());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Try to read cache version from SW
    if ("caches" in window) {
      caches.keys().then((keys) => {
        const versionMatch = keys.find((k) => k.match(/^jhb-(static|images|pages)-v(\d+)/));
        if (versionMatch) {
          const m = versionMatch.match(/v(\d+)/);
          if (m) setSwVersion("v" + m[1]);
        }
      }).catch(() => {});
    }

    // Listen for installed event
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } catch {
      /* user dismissed */
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleCheckUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;
    setUpdateStatus("checking");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setUpdateStatus("no-update");
        return;
      }
      await reg.update();
      // Give SW 2s to detect update
      await new Promise((r) => setTimeout(r, 2000));
      if (reg.waiting) {
        setUpdateStatus("updating");
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        // Page will reload via controllerchange listener in ServiceWorkerRegistration
        setTimeout(() => setUpdateStatus("updated"), 1500);
      } else if (reg.installing) {
        setUpdateStatus("updating");
      } else {
        setUpdateStatus("no-update");
      }
    } catch {
      setUpdateStatus("no-update");
    }
  };

  return (
    <div className="bg-surface min-h-[80vh]">
      <div className="container-main max-w-3xl py-8 sm:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-txt-secondary hover:text-goto-green"
        >
          <ArrowLeft size={14} />
          Beranda
        </Link>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-card-hover ring-4 ring-goto-light">
            <Image
              src="/logo-jhb.png"
              alt="Logo JHB"
              width={72}
              height={72}
              priority
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-txt-primary sm:text-3xl">
            {installed ? "Aplikasi JHB Terpasang" : "Pasang Aplikasi JHB"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-txt-secondary">
            {installed
              ? "Aplikasi sudah berjalan di perangkat Anda dengan tampilan fullscreen."
              : "Pasang JHB di layar utama untuk pengalaman lebih cepat, ringan, dan bisa baca offline."}
          </p>
        </div>

        {/* Status / Action */}
        <div className="mt-8 space-y-4">
          {/* Already installed */}
          {installed && (
            <div className="card flex items-center gap-3 border-2 border-goto-green/30 bg-goto-light/40 p-5">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-goto-green" />
              <div className="flex-1">
                <p className="font-semibold text-txt-primary">Aplikasi sudah aktif</p>
                <p className="mt-0.5 text-xs text-txt-secondary">
                  Anda sedang mengakses via mode aplikasi {swVersion && `· cache ${swVersion}`}
                </p>
              </div>
            </div>
          )}

          {/* Native browser install prompt available */}
          {!installed && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-bold disabled:opacity-50"
            >
              <Download size={18} />
              {installing ? "Memproses..." : "Pasang Sekarang"}
            </button>
          )}

          {/* iOS Safari instructions */}
          {!installed && platform === "ios-safari" && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Apple className="h-5 w-5 text-goto-green" />
                <p className="font-semibold text-txt-primary">Cara pasang di iPhone/iPad</p>
              </div>
              <ol className="space-y-3 text-sm text-txt-secondary">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">1</span>
                  <span>
                    Tap ikon <Share2 className="inline h-4 w-4" /> <strong>Share</strong> di bagian bawah Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">2</span>
                  <span>
                    Scroll dan pilih <Plus className="inline h-4 w-4" /> <strong>&quot;Add to Home Screen&quot;</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">3</span>
                  <span>Tap <strong>&quot;Add&quot;</strong> di pojok kanan atas — selesai!</span>
                </li>
              </ol>
            </div>
          )}

          {/* Android Chrome (no prompt yet) — give Add to Home Screen instructions */}
          {!installed && platform === "android-chrome" && !deferredPrompt && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Chrome className="h-5 w-5 text-goto-green" />
                <p className="font-semibold text-txt-primary">Cara pasang di Android</p>
              </div>
              <ol className="space-y-3 text-sm text-txt-secondary">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">1</span>
                  <span>Tap menu titik tiga <strong>⋮</strong> di kanan atas Chrome</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">2</span>
                  <span>Pilih <strong>&quot;Install app&quot;</strong> atau <strong>&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">3</span>
                  <span>Konfirmasi <strong>Install</strong> — ikon JHB muncul di home screen</span>
                </li>
              </ol>
            </div>
          )}

          {/* Desktop Chrome/Edge (no prompt) */}
          {!installed && (platform === "desktop-chrome") && !deferredPrompt && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Chrome className="h-5 w-5 text-goto-green" />
                <p className="font-semibold text-txt-primary">Cara pasang di Desktop</p>
              </div>
              <ol className="space-y-3 text-sm text-txt-secondary">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">1</span>
                  <span>Klik ikon <Download className="inline h-4 w-4" /> install di sisi kanan address bar</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">2</span>
                  <span>Atau menu titik tiga <strong>⋮</strong> → <strong>&quot;Install Jurnalis Hukum Bandung&quot;</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-goto-light font-bold text-goto-dark">3</span>
                  <span>Konfirmasi <strong>Install</strong> — aplikasi terbuka standalone</span>
                </li>
              </ol>
            </div>
          )}

          {/* Firefox / Safari Desktop / other — explain limitation */}
          {!installed && (platform === "desktop-firefox" || platform === "desktop-safari" || platform === "other") && !deferredPrompt && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-goto-green" />
                <p className="font-semibold text-txt-primary">Buka via Chrome/Edge atau di mobile</p>
              </div>
              <p className="text-sm text-txt-secondary">
                Browser saat ini belum mendukung install PWA langsung. Buka{" "}
                <strong className="text-goto-green">jurnalishukumbandung.com</strong> di:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-txt-secondary">
                <li>Chrome / Edge di Desktop (Windows/Mac)</li>
                <li>Chrome di Android</li>
                <li>Safari di iPhone/iPad (gunakan Add to Home Screen)</li>
              </ul>
            </div>
          )}

          {/* Update button — always visible */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-goto-green" />
              <p className="font-semibold text-txt-primary">Update Aplikasi</p>
            </div>
            <p className="mb-3 text-sm text-txt-secondary">
              Aplikasi otomatis cek update tiap jam saat dibuka. Klik tombol di bawah untuk paksa cek sekarang.
            </p>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={updateStatus === "checking" || updateStatus === "updating"}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${updateStatus === "checking" || updateStatus === "updating" ? "animate-spin" : ""}`} />
              {updateStatus === "checking" && "Mengecek..."}
              {updateStatus === "updating" && "Memperbarui..."}
              {updateStatus === "updated" && "Berhasil diperbarui"}
              {updateStatus === "no-update" && "Sudah versi terbaru"}
              {updateStatus === "idle" && "Cek Update Sekarang"}
            </button>
            {updateStatus === "updating" && (
              <p className="mt-2 text-xs text-goto-green">
                Update sedang dipasang, halaman akan reload otomatis...
              </p>
            )}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-10">
          <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-txt-muted">
            Yang Anda dapatkan
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FeatureItem icon={<Zap />} title="Loading Lebih Cepat" desc="Aset di-cache lokal, buka berita instan tanpa loading lama." />
            <FeatureItem icon={<WifiOff />} title="Baca Offline" desc="Artikel yang sudah dibuka tetap bisa dibaca walau internet mati." />
            <FeatureItem icon={<Bell />} title="Notif Breaking News" desc="Dapat notifikasi push saat ada berita hukum penting." />
            <FeatureItem icon={<BookmarkIcon />} title="Bookmark Sinkron" desc="Simpan artikel untuk dibaca nanti, tersedia offline." />
            <FeatureItem icon={<Smartphone />} title="Tampil Fullscreen" desc="Jalan standalone tanpa address bar, terasa seperti app native." />
            <FeatureItem icon={<RefreshCw />} title="Auto Update" desc="Update otomatis di background, selalu versi terbaru." />
          </div>
        </div>

        {/* CTA bottom */}
        {!installed && (
          <div className="mt-8 text-center">
            <p className="text-xs text-txt-muted">
              Gratis · Tanpa daftar · Tidak ada iklan dalam aplikasi
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-goto-light text-goto-green">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-txt-primary">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-txt-secondary">{desc}</p>
      </div>
    </div>
  );
}

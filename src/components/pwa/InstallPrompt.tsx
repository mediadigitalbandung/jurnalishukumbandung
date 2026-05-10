"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY  = "jhb-pwa-dismissed-at";
const DISMISS_DAYS = 30;

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  const elapsed     = Date.now() - dismissedAt;
  return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) &&
    /safari/i.test(ua) &&
    !/crios|fxios|edgios/i.test(ua)
  );
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const isPanel = pathname?.startsWith("/panel") ?? false;
  const isLogin = pathname?.startsWith("/login") ?? false;

  useEffect(() => {
    if (isPanel || isLogin) return;
    if (isStandalone()) return;
    if (isDismissed()) return;
    if (isIosSafari()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isPanel, isLogin]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      aria-label="Prompt pasang aplikasi Jurnalis Hukum Bandung"
      className="fixed bottom-4 left-4 right-4 z-[150] sm:left-auto sm:right-6 sm:w-80"
    >
      <div className="card flex items-start gap-3 border border-border bg-surface p-4 shadow-card-hover">
        <Image
          src="/icon-192.png"
          alt="Logo Jurnalis Hukum Bandung"
          width={44}
          height={44}
          className="mt-0.5 flex-shrink-0 rounded-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-txt-primary">
            Pasang Aplikasi JHB
          </p>
          <p className="mt-0.5 text-xs leading-snug text-txt-secondary">
            Baca berita hukum Bandung lebih cepat dari layar utama Anda.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Pasang
            </button>
            <button
              onClick={handleDismiss}
              className="btn-ghost px-3 py-1.5 text-xs text-txt-secondary hover:text-txt-primary"
            >
              Nanti saja
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Tutup prompt instalasi"
          className="flex-shrink-0 rounded p-0.5 text-txt-muted transition-colors hover:text-txt-primary"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Check for updates every 60 minutes while app is open
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);

        // Auto-activate new SW when found
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        return () => clearInterval(interval);
      } catch {
        // SW registration failed — non-critical
      }
    };

    register();

    // Try to register periodic background sync (Android Chrome PWA installed only)
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const periodicSync = (reg as ServiceWorkerRegistration & {
          periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> };
        }).periodicSync;
        if (!periodicSync) return;

        const status = await navigator.permissions.query({
          name: "periodic-background-sync" as PermissionName,
        });
        if (status.state === "granted") {
          await periodicSync.register("jhb-prefetch-headlines", {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          });
        }
      } catch {
        /* not supported / permission denied — silent */
      }
    })();

    // Reload page when new SW takes over
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  return null;
}

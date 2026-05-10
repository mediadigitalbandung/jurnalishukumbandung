"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import {
  pushSupported,
  notificationPermission,
  getCurrentSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

type State = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

interface Props {
  /** Optional CSS class for outer button */
  className?: string;
  /** Show label text next to icon (default true) */
  showLabel?: boolean;
  /** Optional heading rendered above the button when bell is visible (hidden if bell hides) */
  heading?: React.ReactNode;
  /** Outer wrapper className */
  wrapperClassName?: string;
}

export default function NotificationBell({ className = "", showLabel = true, heading, wrapperClassName = "" }: Props) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      const perm = notificationPermission();
      if (perm === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      const sub = await getCurrentSubscription();
      if (!cancelled) setState(sub ? "subscribed" : "unsubscribed");
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    const res = await subscribeToPush(["breaking"]);
    setBusy(false);
    if (res.ok) {
      setState("subscribed");
    } else if (res.reason === "permission-denied") {
      setState("denied");
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setBusy(false);
    setState("unsubscribed");
  };

  if (state === "loading" || state === "unsupported") return null;

  // When permission is denied, don't show a noisy disabled pill — hide the bell entirely.
  // User can re-enable from browser site settings; no need to clutter the footer.
  if (state === "denied") return null;

  if (state === "subscribed") {
    return (
      <div className={wrapperClassName}>
        {heading}
        <button
          type="button"
          onClick={handleUnsubscribe}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-full bg-goto-light px-3 py-1.5 text-xs font-semibold text-goto-dark transition hover:bg-goto-green hover:text-white disabled:opacity-50 ${className}`}
          title="Klik untuk berhenti berlangganan notifikasi"
        >
          <BellRing className="h-4 w-4" />
          {showLabel && <span>Notifikasi aktif</span>}
        </button>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      {heading}
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-full border border-goto-green bg-white px-3 py-1.5 text-xs font-semibold text-goto-green transition hover:bg-goto-green hover:text-white disabled:opacity-50 ${className}`}
        title="Aktifkan notifikasi breaking news"
      >
        <Bell className="h-4 w-4" />
        {showLabel && <span>{busy ? "Memproses..." : "Aktifkan Notifikasi"}</span>}
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (t: string, cb: () => void) => void };

/** Ekranı açık tutar (destekleyen tarayıcılarda: Chrome/Edge Android, Safari 16.4+). Sekme gizlenip dönünce yeniden alınır. */
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || !supported) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const wl = (navigator as unknown as { wakeLock: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
        const s = await wl.request("screen");
        if (cancelled) {
          s.release().catch(() => undefined);
          return;
        }
        sentinel = s;
        setHeld(true);
        s.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !sentinel) acquire();
      if (document.visibilityState === "hidden") sentinel = null;
    };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => undefined);
      setHeld(false);
    };
  }, [active, supported]);

  return { supported, held };
}

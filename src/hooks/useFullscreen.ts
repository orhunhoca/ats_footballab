import { useCallback, useEffect, useState } from "react";

/** Tarayıcıyı tam ekrana alır (adres çubuğu gizlenir); Android'de yatay yönü de kilitlemeyi dener. iPhone Safari desteklemez → supported=false. */
export function useFullscreen() {
  const supported = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        (screen.orientation as unknown as { unlock?: () => void })?.unlock?.();
      } else {
        await document.documentElement.requestFullscreen();
        await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => undefined);
      }
    } catch {
      /* desteklenmiyor / izin verilmedi */
    }
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, []);

  return { supported, full, toggle, exit };
}

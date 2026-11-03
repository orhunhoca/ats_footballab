import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "error";

/** Kamera akışını video öğesine bağlar (varsayılan arka kamera). Bileşen kapanınca akış durdurulur. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState("");
  const [aspect, setAspect] = useState(16 / 9);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (facing: "environment" | "user" = "environment") => {
      stop();
      setStatus("starting");
      setError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError("Bu tarayıcı kamerayı desteklemiyor. Güncel Chrome veya Safari kullanın (adres https:// olmalı).");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, min: 24 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        const settings = stream.getVideoTracks()[0]?.getSettings();
        if (settings?.width && settings?.height) setAspect(settings.width / settings.height);
        setStatus("ready");
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setStatus("error");
        setError(
          name === "NotAllowedError"
            ? "Kamera izni verilmedi. Tarayıcı adres çubuğundaki kilit simgesinden kamerayı \"İzin ver\" yapın."
            : name === "NotFoundError"
              ? "Kamera bulunamadı."
              : "Kamera açılamadı. Başka bir uygulama kamerayı kullanıyor olabilir."
        );
      }
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { videoRef, status, error, aspect, start, stop };
}

/** Her video karesinde çağırır (destekleniyorsa requestVideoFrameCallback; zaman damgası kamera yakalama anı). */
export function onVideoFrame(video: HTMLVideoElement, cb: (tMs: number) => void): () => void {
  let cancelled = false;
  let handle = 0;
  const v = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, meta: { captureTime?: number }) => void) => number;
    cancelVideoFrameCallback?: (h: number) => void;
  };
  if (typeof v.requestVideoFrameCallback === "function") {
    const loop = (now: number, meta: { captureTime?: number }) => {
      if (cancelled) return;
      cb(meta?.captureTime ?? now);
      handle = v.requestVideoFrameCallback!(loop);
    };
    handle = v.requestVideoFrameCallback(loop);
    return () => {
      cancelled = true;
      v.cancelVideoFrameCallback?.(handle);
    };
  }
  const loop = () => {
    if (cancelled) return;
    cb(performance.now());
    handle = requestAnimationFrame(loop);
  };
  handle = requestAnimationFrame(loop);
  return () => {
    cancelled = true;
    cancelAnimationFrame(handle);
  };
}

/** Kısa uyarı sesi (çıkış işareti) */
export function beep(freq = 880, ms = 180) {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
    osc.onended = () => ctx.close();
  } catch {
    /* ses desteklenmiyor */
  }
}

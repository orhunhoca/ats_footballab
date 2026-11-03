import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Camera } from "lucide-react";
import { beep, onVideoFrame, useCamera } from "@/hooks/useCamera";
import { usePoseLandmarker } from "@/hooks/usePoseLandmarker";
import { JumpTracker, type JumpState } from "@/lib/measure/jumpFlight";
import type { Landmark } from "@/lib/measure/plankPose";
import type { MeasureResult } from "./measureTypes";
import { BIG_BTN, stageStyle } from "./cameraStyle";

function snap(video: HTMLVideoElement): string {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = Math.round(320 / (video.videoWidth / video.videoHeight || 16 / 9));
  c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

const vis = (l: Landmark | undefined) => (l?.visibility ?? 1) >= 0.5;

/** Dikey sıçrama: ayakların havada kalma süresinden yükseklik */
export function JumpMeter({ heightCm, onResult }: { heightCm?: number | null; onResult: (r: MeasureResult) => void }) {
  const { videoRef, status, error, aspect, start } = useCamera();
  const { landmarker, state: modelState, error: modelError } = usePoseLandmarker();
  const tracker = useRef<JumpTracker | null>(null);
  const snaps = useRef<{ label: string; src: string }[]>([]);
  const lastUi = useRef(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [running, setRunning] = useState(false);
  const [state, setState] = useState<JumpState>("calibrating");
  const [seen, setSeen] = useState(true);
  const [reason, setReason] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    start(facing);
  }, [facing, start]);

  // Karelerin tümü işlenir (kamera kare hızı kadar hassasiyet için)
  useEffect(() => {
    const video = videoRef.current;
    if (!running || status !== "ready" || modelState !== "ready" || !video) return;
    return onVideoFrame(video, (t) => {
      const lm = landmarker.current;
      const tr = tracker.current;
      if (!lm || !tr || video.readyState < 2 || tr.state === "done" || tr.state === "invalid") return;
      let lms: Landmark[] | undefined;
      try {
        lms = lm.detectForVideo(video, t).landmarks?.[0];
      } catch {
        return;
      }
      const nose = lms?.[0];
      const ankles = [lms?.[27], lms?.[28]].filter((l): l is Landmark => !!l && vis(l));
      const heels = [lms?.[29], lms?.[30]].filter((l): l is Landmark => !!l && vis(l));
      if (!lms || !vis(nose) || ankles.length === 0) {
        if (t - lastUi.current > 300) {
          lastUi.current = t;
          setSeen(false);
        }
        return;
      }
      const feet = [...ankles, ...heels];
      const footY = feet.reduce((s, l) => s + l.y, 0) / feet.length;
      const bodyH = footY - (nose as Landmark).y;
      const before = tr.state;
      const changed = tr.push({ t, footY, bodyH });
      if (!seen || t - lastUi.current > 300) {
        lastUi.current = t;
        setSeen(true);
      }
      if (changed) {
        const now = tr.state as JumpState;
        if (now === "ready" && before === "calibrating") beep(880, 150);
        if (now === "airborne") snaps.current = [{ label: "Kalkış anı (yaklaşık)", src: snap(video) }];
        if (now === "done" && tr.result) {
          snaps.current.push({ label: "İniş anı (yaklaşık)", src: snap(video) });
          beep(660, 150);
          setRunning(false);
          onResultRef.current({
            value: tr.result.heightCm,
            label: "sıçrama yüksekliği",
            detail: `Havada kalma süresi: ${tr.result.flightSeconds.toFixed(3)} sn`,
            method: `Kamera poz analizi, havada kalma süresi ${tr.result.flightSeconds.toFixed(3)} sn (h = g·t²/8)`,
            snapshots: snaps.current,
          });
        }
        if (now === "invalid") {
          setReason(tr.reason);
          setRunning(false);
        }
        setState(now);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, status, modelState]);

  const begin = () => {
    // Burun-ayak mesafesi ≈ boyun %90'ı
    tracker.current = new JumpTracker(800, 0.02, 0.15, 1.0, ((heightCm && heightCm > 80 ? heightCm : 135) * 0.9) / 100);
    snaps.current = [];
    setReason("");
    setState("calibrating");
    setRunning(true);
  };

  const message = !running
    ? reason || "Çocuk kameraya yan ya da karşı durup başından ayağına görünsün, ayaklar yerde. “Başlat”a basın, bip sesini bekleyin, sonra zıplasın."
    : !seen
      ? "Çocuk tam görünmüyor: baştan ayağa görüntüye alın."
      : state === "calibrating"
        ? "Sabit durun, ayaklar yerde… (algılanıyor)"
        : state === "ready"
          ? "ZIPLA! (bip duydunuz) — ayaklar düz, iki ayakla zıplayıp iki ayakla inin."
          : "Havada…";

  return (
    <div className="space-y-3">
      <div className="relative mx-auto overflow-hidden rounded-lg bg-black" style={stageStyle(aspect)}>
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-contain" />
        {status === "ready" && running && state === "ready" && (
          <div className="absolute inset-x-0 top-3 text-center">
            <span className="rounded-full bg-emerald-600 px-4 py-1 text-lg font-bold text-white shadow">ZIPLA!</span>
          </div>
        )}
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
            {status === "error" ? error : <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
        )}
      </div>

      {modelState === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Yapay zekâ modeli yükleniyor…
        </p>
      )}
      {modelState === "error" && <p className="text-sm text-destructive">{modelError}</p>}
      <p className="text-sm font-medium">{message}</p>

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button size="lg" className={BIG_BTN} onClick={begin} disabled={status !== "ready" || modelState !== "ready"}>
            <Play className="mr-2 h-4 w-4" /> Başlat
          </Button>
        ) : (
          <Button size="lg" className={BIG_BTN} variant="destructive" onClick={() => setRunning(false)}>
            <Square className="mr-2 h-4 w-4" /> İptal
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={running} onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
          <Camera className="mr-2 h-4 w-4" /> Kamerayı çevir
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Telefonu sabit bir yere, çocuğun 2–3 m önüne, bel hizasında koyun; baştan ayağa görünsün. Yükseklik havada kalma süresinden hesaplanır (diz bükmeden
        kalkıp inmek gerekir); kare hızı ve poz hatası nedeniyle birkaç cm sapma olabilir — sonucu kontrol edip onaylarsınız.
      </p>
    </div>
  );
}

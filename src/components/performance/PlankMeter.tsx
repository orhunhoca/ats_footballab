import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Camera } from "lucide-react";
import { beep, useCamera } from "@/hooks/useCamera";
import { usePoseLandmarker } from "@/hooks/usePoseLandmarker";
import { checkPlankPose, PlankTracker, LM, type Landmark, type PlankCheck } from "@/lib/measure/plankPose";
import type { MeasureResult } from "./measureTypes";

const HINT: Record<NonNullable<PlankCheck["reason"]>, string> = {
  gorunmuyor: "Çocuk tam görünmüyor: yandan, baştan ayağa görüntüye alın.",
  kalca: "Kalça sarkıyor ya da yükseliyor — vücut düz çizgi olmalı.",
  yatay: "Vücut yere paralel değil.",
  destek: "Dirsekler omuz hizasında/altında olmalı.",
  diz: "Dizler yerden kalkık ve düz olmalı.",
};

function snap(video: HTMLVideoElement): string {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = Math.round(320 / (video.videoWidth / video.videoHeight || 16 / 9));
  c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export function PlankMeter({ onResult }: { onResult: (r: MeasureResult) => void }) {
  const { videoRef, status, error, aspect, start } = useCamera();
  const overlay = useRef<HTMLCanvasElement | null>(null);
  const { landmarker, state: modelState, error: modelError } = usePoseLandmarker();
  const tracker = useRef(new PlankTracker());
  const snaps = useRef<{ label: string; src: string }[]>([]);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [running, setRunning] = useState(false);
  const [state, setState] = useState<"waiting" | "running" | "done">("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [check, setCheck] = useState<PlankCheck | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    start(facing);
  }, [facing, start]);

  // Algılama döngüsü (~10 kare/sn)
  useEffect(() => {
    const video = videoRef.current;
    if (!running || status !== "ready" || modelState !== "ready" || !video) return;
    const id = window.setInterval(() => {
      const lm = landmarker.current;
      if (!lm || video.readyState < 2) return;
      const t = performance.now();
      let lms: Landmark[] | undefined;
      try {
        lms = lm.detectForVideo(video, t).landmarks?.[0];
      } catch {
        return;
      }
      const res = checkPlankPose(lms, video.videoWidth / video.videoHeight || aspect);
      setCheck(res);
      drawOverlay(overlay.current, lms, res.ok);
      const tr = tracker.current;
      const before = tr.state;
      const changed = tr.push(t, res.ok);
      if (changed && tr.state === "running" && before !== "running") {
        snaps.current = [{ label: "Plank başladı (yaklaşık)", src: snap(video) }];
        beep(880, 120);
      }
      if (tr.state === "running") setElapsed(tr.elapsedSeconds(t));
      if (changed && tr.state === "done") finish();
      setState(tr.state);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, status, modelState]);

  const finish = () => {
    const tr = tracker.current;
    const video = videoRef.current;
    if (!tr.result) return;
    setRunning(false);
    drawOverlay(overlay.current, undefined, false);
    if (video) snaps.current.push({ label: "Plank bitti (yaklaşık)", src: snap(video) });
    beep(660, 200);
    onResultRef.current({
      value: tr.result.seconds,
      method: `Kamera poz analizi (plank), ${tr.result.endedBy === "elle" ? "elle durduruldu" : "duruş bozulunca otomatik bitti"}`,
      snapshots: snaps.current,
    });
  };

  const begin = () => {
    tracker.current = new PlankTracker();
    snaps.current = [];
    setElapsed(0);
    setCheck(null);
    setState("waiting");
    setRunning(true);
  };

  const stopManually = () => {
    const tr = tracker.current;
    if (tr.state === "running") {
      tr.stop(performance.now());
      setState("done");
      finish();
    } else {
      setRunning(false);
    }
  };

  const message =
    !running
      ? "Çocuk plank pozisyonuna geçmeden önce “Başlat”a basın; duruş doğru olunca süre kendiliğinden başlar."
      : state === "waiting"
        ? check?.ok
          ? "Duruş doğru, süre başlıyor… sabit kalın."
          : check?.reason
            ? HINT[check.reason]
            : "Plank pozisyonunu alın…"
        : check && !check.ok && check.reason
          ? `Dikkat: ${HINT[check.reason]}`
          : "Süre işliyor.";

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: String(aspect) }}>
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-contain" />
        <canvas ref={overlay} className="pointer-events-none absolute inset-0 h-full w-full" width={640} height={Math.round(640 / aspect)} />
        {status === "ready" && running && state === "running" && (
          <div className="absolute inset-x-0 top-3 text-center">
            <span className="rounded-full bg-emerald-600 px-4 py-1 text-2xl font-bold tabular-nums text-white shadow">{elapsed.toFixed(1)} sn</span>
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
          <Loader2 className="h-4 w-4 animate-spin" /> Yapay zekâ modeli yükleniyor (ilk açılışta birkaç saniye sürebilir)…
        </p>
      )}
      {modelState === "error" && <p className="text-sm text-destructive">{modelError}</p>}
      <p className="text-sm font-medium">{message}</p>

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button onClick={begin} disabled={status !== "ready" || modelState !== "ready"}>
            <Play className="mr-2 h-4 w-4" /> Başlat
          </Button>
        ) : (
          <Button variant="destructive" onClick={stopManually}>
            <Square className="mr-2 h-4 w-4" /> {state === "running" ? "Bitir" : "İptal"}
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={running} onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
          <Camera className="mr-2 h-4 w-4" /> Kamerayı çevir
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Telefonu sabit bir yere, çocuğun yan tarafına yere yakın (yaklaşık bel yüksekliğinden aşağı) koyun; baştan ayağa görünsün. Süre, duruş 2 saniyeden uzun
        bozulunca otomatik biter. Sonucu bir sonraki adımda kontrol edip onaylarsınız.
      </p>
    </div>
  );
}

const BONES: [number, number][] = [
  [LM.lShoulder, LM.lElbow], [LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow], [LM.rElbow, LM.rWrist],
  [LM.lShoulder, LM.lHip], [LM.rShoulder, LM.rHip], [LM.lHip, LM.lKnee], [LM.lKnee, LM.lAnkle],
  [LM.rHip, LM.rKnee], [LM.rKnee, LM.rAnkle], [LM.lShoulder, LM.rShoulder], [LM.lHip, LM.rHip],
];

function drawOverlay(canvas: HTMLCanvasElement | null, lms: Landmark[] | undefined, ok: boolean) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lms) return;
  ctx.strokeStyle = ok ? "#22c55e" : "#f59e0b";
  ctx.lineWidth = 3;
  for (const [a, b] of BONES) {
    const p = lms[a];
    const q = lms[b];
    if (!p || !q) continue;
    ctx.beginPath();
    ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
    ctx.lineTo(q.x * canvas.width, q.y * canvas.height);
    ctx.stroke();
  }
}

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Play, RotateCcw, Camera, Hand } from "lucide-react";
import { beep, onVideoFrame, useCamera } from "@/hooks/useCamera";
import { gateActivity, SprintSession, toGray, type SprintState } from "@/lib/measure/gateMotion";
import type { MeasureResult } from "./measureTypes";

const W = 192;
const H = 108;
const STRIP = 0.03; // kapı şeridi genişliği (yarı genişlik, görüntü oranı)

function snap(video: HTMLVideoElement): string {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = Math.round(320 / (video.videoWidth / video.videoHeight || 16 / 9));
  c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export function SprintMeter({ distance, onResult }: { distance: number; onResult: (r: MeasureResult) => void }) {
  const { videoRef, status, error, aspect, start } = useCamera();
  const [startPos, setStartPos] = useState(15);
  const [finishPos, setFinishPos] = useState(85);
  const [manual, setManual] = useState(false);
  const [state, setState] = useState<SprintState>("idle");
  const [go, setGo] = useState(false);
  const [message, setMessage] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const session = useRef<SprintSession | null>(null);
  const gates = useRef({ start: 15, finish: 85 });
  const snaps = useRef<{ label: string; src: string }[]>([]);
  const prev = useRef<Uint8Array | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const timers = useRef<number[]>([]);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  gates.current = { start: startPos, finish: finishPos };

  useEffect(() => {
    start(facing);
  }, [facing, start]);

  // Kare döngüsü
  useEffect(() => {
    const video = videoRef.current;
    if (status !== "ready" || !video) return;
    if (!canvas.current) {
      canvas.current = document.createElement("canvas");
      canvas.current.width = W;
      canvas.current.height = H;
    }
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    return onVideoFrame(video, (t) => {
      ctx.drawImage(video, 0, 0, W, H);
      const gray = toGray(ctx.getImageData(0, 0, W, H).data);
      const p = prev.current;
      prev.current = gray;
      const s = session.current;
      if (!p || !s || (s.state !== "armed" && s.state !== "running")) return;
      const g = gates.current;
      const sa = gateActivity(p, gray, W, H, { x0: g.start / 100 - STRIP, x1: g.start / 100 + STRIP });
      const fa = gateActivity(p, gray, W, H, { x0: g.finish / 100 - STRIP, x1: g.finish / 100 + STRIP });
      const before = s.state;
      if (s.push(t, sa, fa)) {
        const now = s.state as SprintState;
        if (now === "running" && before !== "running") {
          snaps.current = [{ label: "Çıkış anı (yaklaşık)", src: snap(video) }];
          setMessage("Koşuyor… bitiş çizgisi bekleniyor");
        }
        if (now === "done" && s.result) {
          snaps.current.push({ label: "Bitiş anı (yaklaşık)", src: snap(video) });
          beep(660, 120);
          onResultRef.current({
            value: s.result.seconds,
            method: `Kamera hareket kapıları, ${distance} m, ${s.result.startMode === "auto" ? "otomatik çıkış" : "elle çıkış"}`,
            snapshots: snaps.current,
          });
        }
        if (now === "timeout") setMessage("Süre aşıldı, tekrar deneyin.");
        setState(now);
      }
    });
  }, [status, videoRef, distance]);

  useEffect(() => () => timers.current.forEach((x) => clearTimeout(x)), []);

  const arm = () => {
    timers.current.forEach((x) => clearTimeout(x));
    timers.current = [];
    snaps.current = [];
    prev.current = null;
    const s = new SprintSession({ startMode: manual ? "manual" : "auto" });
    s.arm(performance.now());
    session.current = s;
    setState("armed");
    setGo(false);
    setMessage(manual ? "Hazır. Çocuk çıkışa geçti, \"ÇIK\" düğmesine basın." : "Çocuk çıkış çizgisinde sabit dursun… işaretten sonra koşar.");
    if (!manual) {
      timers.current.push(
        window.setTimeout(() => {
          beep();
          setGo(true);
          setMessage("ÇIK! Çocuk hareket ettiği an süre başlar.");
        }, 1500)
      );
    }
  };

  const manualGo = () => {
    const s = session.current;
    if (!s) return;
    s.manualStart(performance.now());
    snaps.current = [{ label: "Çıkış anı (yaklaşık)", src: videoRef.current ? snap(videoRef.current) : "" }];
    setState("running");
    setMessage("Koşuyor… bitiş çizgisi bekleniyor");
  };

  const reset = () => {
    session.current = null;
    setState("idle");
    setGo(false);
    setMessage("");
  };

  const active = state === "armed" || state === "running";

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: String(aspect) }}>
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 h-full w-full object-contain" />
        {status === "ready" && (
          <>
            <Gate pos={startPos} color="#22c55e" label="ÇIKIŞ" />
            <Gate pos={finishPos} color="#ef4444" label="BİTİŞ" />
            {go && state !== "done" && (
              <div className="absolute inset-x-0 top-3 text-center">
                <span className="rounded-full bg-emerald-600 px-4 py-1 text-lg font-bold text-white shadow">ÇIK!</span>
              </div>
            )}
          </>
        )}
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
            {status === "error" ? error : <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-emerald-700">Çıkış çizgisi konumu</Label>
          <input type="range" min={3} max={97} value={startPos} disabled={active} onChange={(e) => setStartPos(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <Label className="text-xs text-red-700">Bitiş çizgisi konumu</Label>
          <input type="range" min={3} max={97} value={finishPos} disabled={active} onChange={(e) => setFinishPos(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={manual} disabled={active} onChange={(e) => setManual(e.target.checked)} />
        Çıkışı elle başlat (düğmeyle; otomatik çıkış tespiti yerine)
      </label>

      {message && <p className="text-sm font-medium">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {state === "idle" || state === "timeout" || state === "done" ? (
          <Button onClick={arm} disabled={status !== "ready"}>
            <Play className="mr-2 h-4 w-4" /> Hazırla ve Başlat
          </Button>
        ) : (
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" /> İptal
          </Button>
        )}
        {state === "armed" && manual && (
          <Button onClick={manualGo} className="bg-emerald-600 hover:bg-emerald-700">
            <Hand className="mr-2 h-4 w-4" /> ÇIK
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={active} onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
          <Camera className="mr-2 h-4 w-4" /> Kamerayı çevir
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Telefonu sabit bir yere (sehpa) yan taraftan koyun; iki çizgi de görüntüde olsun. Çizgi konumlarını kaydırıcılarla çıkış ve bitiş çizgisine
        hizalayın. Ölçüm kare hızıyla sınırlıdır (30 kare/sn ≈ ±0,03 sn); sonucu bir sonraki adımda kontrol edip onaylarsınız.
      </p>
    </div>
  );
}

function Gate({ pos, color, label }: { pos: number; color: string; label: string }) {
  const left = pos - STRIP * 100;
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-y-0"
        style={{ left: `${left}%`, width: `${STRIP * 200}%`, background: `${color}33`, borderLeft: `2px solid ${color}`, borderRight: `2px solid ${color}` }}
      />
      <span className="absolute top-1 -translate-x-1/2 rounded px-1 text-[10px] font-bold text-white" style={{ left: `${pos}%`, background: color }}>
        {label}
      </span>
    </div>
  );
}

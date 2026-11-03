/**
 * Kamerayla sprint süre ölçümü için hareket kapıları.
 * Görüntü küçük gri kareye indirilir; dikey bir şeritteki (kapı) piksellerin bir önceki kareye göre
 * değişen oranı "etkinlik"tir. Çocuk kapıdan geçince etkinlik yükselir; ardışık N karede eşik aşılırsa
 * kapı tetiklenir ve süre, tetikleyen İLK karenin zaman damgasıdır.
 */

export interface GateRange {
  /** şeridin sol kenarı (0–1, görüntü genişliğine oranla) */
  x0: number;
  /** şeridin sağ kenarı (0–1) */
  x1: number;
}

/** RGBA verisini gri kareye çevirir (ITU-R 601) */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, out?: Uint8Array): Uint8Array {
  const n = rgba.length / 4;
  const g = out && out.length === n ? out : new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    g[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
  }
  return g;
}

/** Kapı şeridinde, önceki kareye göre |fark| > pixelDiff olan piksellerin oranı (0–1) */
export function gateActivity(
  prev: Uint8Array,
  cur: Uint8Array,
  width: number,
  height: number,
  gate: GateRange,
  pixelDiff = 24
): number {
  const xa = Math.max(0, Math.floor(gate.x0 * width));
  const xb = Math.min(width, Math.max(xa + 1, Math.ceil(gate.x1 * width)));
  let changed = 0;
  let total = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = xa; x < xb; x++) {
      total++;
      if (Math.abs(cur[row + x] - prev[row + x]) > pixelDiff) changed++;
    }
  }
  return total === 0 ? 0 : changed / total;
}

/** Eşik üstü etkinlik ardışık minFrames karede sürerse tetikler; tetik zamanı serinin ilk karesidir. */
export class GateDetector {
  private run: { t: number }[] = [];
  triggeredAt: number | null = null;

  constructor(
    private readonly threshold = 0.04,
    private readonly minFrames = 2
  ) {}

  reset() {
    this.run = [];
    this.triggeredAt = null;
  }

  /** @returns tetiklendiyse tetik zamanı (ms), yoksa null */
  push(t: number, activity: number): number | null {
    if (this.triggeredAt !== null) return this.triggeredAt;
    if (activity >= this.threshold) {
      this.run.push({ t });
      if (this.run.length >= this.minFrames) {
        this.triggeredAt = this.run[0].t;
        return this.triggeredAt;
      }
    } else {
      this.run = [];
    }
    return null;
  }
}

export type SprintState = "idle" | "armed" | "running" | "done" | "timeout";

export interface SprintResult {
  startMs: number;
  finishMs: number;
  seconds: number;
  startMode: "auto" | "manual";
}

/**
 * Sprint oturumu: hazırlan (arm) → çıkış (otomatik: çıkış kapısı hareketi, ya da elle) → bitiş kapısı → süre.
 * - settleMs: hazırlanma tuşuna basma hareketini yok saymak için bekleme
 * - minDurationMs: çıkış ile bitiş arasındaki en kısa süre (gürültü/hatalı tetik koruması)
 * - maxDurationMs: bu süre aşılırsa vazgeçilir
 */
export class SprintSession {
  state: SprintState = "idle";
  result: SprintResult | null = null;
  private armedAt = 0;
  private startMs = 0;
  private startMode: "auto" | "manual" = "auto";
  private startGate: GateDetector;
  private finishGate: GateDetector;

  constructor(
    private readonly opts: {
      startMode: "auto" | "manual";
      settleMs?: number;
      minDurationMs?: number;
      maxDurationMs?: number;
      threshold?: number;
    }
  ) {
    this.startGate = new GateDetector(opts.threshold);
    this.finishGate = new GateDetector(opts.threshold);
  }

  arm(t: number) {
    this.state = "armed";
    this.result = null;
    this.armedAt = t;
    this.startGate.reset();
    this.finishGate.reset();
  }

  /** Elle başlat (çıkış düğmesi / sesli komut anı) */
  manualStart(t: number) {
    if (this.state !== "armed") return;
    this.startMode = "manual";
    this.startMs = t;
    this.state = "running";
    this.finishGate.reset();
  }

  /** Her kare için çağrılır. Durum değişince true döner. */
  push(t: number, startActivity: number, finishActivity: number): boolean {
    const settle = this.opts.settleMs ?? 1500;
    const minDur = this.opts.minDurationMs ?? 300;
    const maxDur = this.opts.maxDurationMs ?? 30000;

    if (this.state === "armed" && this.opts.startMode === "auto" && t - this.armedAt >= settle) {
      const trig = this.startGate.push(t, startActivity);
      if (trig !== null) {
        this.startMode = "auto";
        this.startMs = trig;
        this.state = "running";
        this.finishGate.reset();
        return true;
      }
    }

    if (this.state === "running") {
      if (t - this.startMs > maxDur) {
        this.state = "timeout";
        return true;
      }
      if (t - this.startMs >= minDur) {
        const trig = this.finishGate.push(t, finishActivity);
        if (trig !== null && trig - this.startMs >= minDur) {
          this.result = {
            startMs: this.startMs,
            finishMs: trig,
            seconds: Math.round(((trig - this.startMs) / 1000) * 100) / 100,
            startMode: this.startMode,
          };
          this.state = "done";
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Plank süre ölçümü: poz iskeleti (MediaPipe Pose, 33 nokta) üzerinden yan görünümde plank duruşu tespiti.
 * Duruş geçerliyken süre işler; duruş bozulunca (kalça düşmesi/yükselmesi, diz değmesi, kalkma) biter.
 */

export interface Landmark {
  x: number; // 0–1
  y: number; // 0–1 (aşağı doğru artar)
  visibility?: number;
}

export const LM = {
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
} as const;

export interface PlankCheck {
  ok: boolean;
  reason?: "gorunmuyor" | "kalca" | "yatay" | "destek" | "diz";
  hipAngle?: number;
  tilt?: number;
}

function angleDeg(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (m === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI;
}

export interface PlankThresholds {
  minVisibility: number;
  /** omuz-kalça-ayak açısı en az (180 = düz çizgi) */
  minHipAngle: number;
  /** omuz→ayak çizgisinin yataya en çok eğimi (derece) */
  maxTilt: number;
  /** kalça-diz-ayak açısı en az (diz bükülmemeli) */
  minKneeAngle: number;
}

export const DEFAULT_PLANK_THRESHOLDS: PlankThresholds = {
  minVisibility: 0.5,
  minHipAngle: 155,
  maxTilt: 30,
  minKneeAngle: 150,
};

/**
 * Yan görünümde plank duruşu mu? aspect = video genişlik/yükseklik (açıların doğru hesabı için).
 * Kameraya yakın taraf (görünürlüğü yüksek) kullanılır.
 */
export function checkPlankPose(lms: Landmark[] | undefined, aspect: number, th: PlankThresholds = DEFAULT_PLANK_THRESHOLDS): PlankCheck {
  if (!lms || lms.length < 29) return { ok: false, reason: "gorunmuyor" };
  const vis = (i: number) => lms[i]?.visibility ?? 1;
  const leftScore = vis(LM.lShoulder) + vis(LM.lHip) + vis(LM.lAnkle) + vis(LM.lKnee);
  const rightScore = vis(LM.rShoulder) + vis(LM.rHip) + vis(LM.rAnkle) + vis(LM.rKnee);
  const left = leftScore >= rightScore;
  const idx = left
    ? { s: LM.lShoulder, e: LM.lElbow, h: LM.lHip, k: LM.lKnee, a: LM.lAnkle }
    : { s: LM.rShoulder, e: LM.rElbow, h: LM.rHip, k: LM.rKnee, a: LM.rAnkle };

  if ([idx.s, idx.h, idx.k, idx.a].some((i) => vis(i) < th.minVisibility)) return { ok: false, reason: "gorunmuyor" };

  const P = (i: number) => ({ x: lms[i].x * aspect, y: lms[i].y });
  const s = P(idx.s), h = P(idx.h), k = P(idx.k), a = P(idx.a), e = P(idx.e);

  const hipAngle = angleDeg(s, h, a);
  const kneeAngle = angleDeg(h, k, a);
  const tilt = (Math.atan2(Math.abs(a.y - s.y), Math.abs(a.x - s.x)) * 180) / Math.PI;

  if (tilt > th.maxTilt) return { ok: false, reason: "yatay", hipAngle, tilt };
  if (hipAngle < th.minHipAngle) return { ok: false, reason: "kalca", hipAngle, tilt };
  if (kneeAngle < th.minKneeAngle) return { ok: false, reason: "diz", hipAngle, tilt };
  // Dirsek/el omuzla aynı hizada ya da altında (yerde destek)
  if (vis(idx.e) >= th.minVisibility && e.y < s.y - 0.03) return { ok: false, reason: "destek", hipAngle, tilt };
  return { ok: true, hipAngle, tilt };
}

export type PlankState = "waiting" | "running" | "done";

export interface PlankResult {
  startMs: number;
  endMs: number;
  seconds: number;
  endedBy: "bozuldu" | "elle";
}

/**
 * Süre takipçisi: duruş startHoldMs boyunca kesintisiz geçerliyse başlar (süre o sürenin başından sayılır);
 * duruş breakMs'den uzun süre bozuk kalırsa biter (süre, bozulmanın başladığı ana kadar).
 */
export class PlankTracker {
  state: PlankState = "waiting";
  result: PlankResult | null = null;
  private okSince: number | null = null;
  private startMs = 0;
  private badSince: number | null = null;
  private lastOk = 0;

  constructor(
    private readonly startHoldMs = 1500,
    private readonly breakMs = 2000
  ) {}

  reset() {
    this.state = "waiting";
    this.result = null;
    this.okSince = null;
    this.badSince = null;
  }

  /** @returns durum değiştiyse true */
  push(t: number, ok: boolean): boolean {
    if (this.state === "waiting") {
      if (ok) {
        if (this.okSince === null) this.okSince = t;
        if (t - this.okSince >= this.startHoldMs) {
          this.state = "running";
          this.startMs = this.okSince;
          this.lastOk = t;
          this.badSince = null;
          return true;
        }
      } else {
        this.okSince = null;
      }
      return false;
    }
    if (this.state === "running") {
      if (ok) {
        this.lastOk = t;
        this.badSince = null;
      } else {
        if (this.badSince === null) this.badSince = t;
        if (t - this.badSince >= this.breakMs) {
          this.finish(this.badSince, "bozuldu");
          return true;
        }
      }
    }
    return false;
  }

  /** Elle durdur (o ana kadarki süre) */
  stop(t: number) {
    if (this.state === "running") this.finish(this.badSince ?? t, "elle");
  }

  /** Süre akarken anlık süre (sn) */
  elapsedSeconds(t: number): number {
    return this.state === "running" ? Math.max(0, (t - this.startMs) / 1000) : this.result?.seconds ?? 0;
  }

  private finish(endMs: number, by: PlankResult["endedBy"]) {
    this.state = "done";
    this.result = {
      startMs: this.startMs,
      endMs,
      seconds: Math.round(((endMs - this.startMs) / 1000) * 10) / 10,
      endedBy: by,
    };
  }
}

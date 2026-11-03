/**
 * Dikey sıçrama: havada kalma süresinden yükseklik (h = g·t²/8).
 * Ayak bileği/topuk yüksekliği (görüntüde y; aşağı doğru artar) karelerinden kalkış ve iniş anı bulunur;
 * eşik geçişleri kareler arasında doğrusal interpolasyonla ince ayarlanır.
 */
export const G = 9.81;

export interface JumpFrame {
  /** ms */
  t: number;
  /** ayakların ortalama dikey konumu (0–1, aşağı doğru artar) */
  footY: number;
  /** vücut boyu (baş-ayak, 0–1 normalize); eşiği ölçeklemek için */
  bodyH: number;
}

export interface JumpResult {
  takeoffMs: number;
  landingMs: number;
  flightSeconds: number;
  heightCm: number;
}

export const heightFromFlight = (flightSeconds: number) => (G * flightSeconds * flightSeconds * 100) / 8;

export type JumpState = "calibrating" | "ready" | "airborne" | "done" | "invalid";

/**
 * Takipçi: önce duruş (kalibrasyon: ayaklar sabit), sonra ayaklar zeminden eşik kadar yükselince "havada",
 * eşik altına dönünce iniş. Geçerli süre 0,15–1,0 sn.
 */
export class JumpTracker {
  state: JumpState = "calibrating";
  result: JumpResult | null = null;
  reason = "";
  private calib: JumpFrame[] = [];
  private baseline = 0;
  private bodyHNorm = 0.7;
  private thr = 0;
  private prev: JumpFrame | null = null;
  private takeoff = 0;
  private aboveCount = 0;
  private firstAbove: JumpFrame | null = null;
  private lastBelow: JumpFrame | null = null;

  constructor(
    private readonly calibMs = 800,
    private readonly thrFrac = 0.02,
    private readonly minFlight = 0.15,
    private readonly maxFlight = 1.0,
    /** çocuğun baş-ayak boyu (metre); eşik düzeltmesi için yaklaşık değer yeter (varsayılan ≈ 1,2 m) */
    private readonly bodyMeters = 1.2
  ) {}

  reset() {
    this.state = "calibrating";
    this.result = null;
    this.reason = "";
    this.calib = [];
    this.prev = null;
    this.aboveCount = 0;
    this.firstAbove = null;
    this.lastBelow = null;
  }

  /** @returns durum değiştiyse true */
  push(f: JumpFrame): boolean {
    if (this.state === "calibrating") {
      this.calib.push(f);
      while (this.calib.length > 1 && f.t - this.calib[0].t > this.calibMs) this.calib.shift();
      if (this.calib.length >= 6 && f.t - this.calib[0].t >= this.calibMs * 0.9) {
        const ys = this.calib.map((c) => c.footY);
        const spread = Math.max(...ys) - Math.min(...ys);
        const bodyH = median(this.calib.map((c) => c.bodyH));
        if (spread < 0.012 * Math.max(bodyH, 0.3) * 2) {
          this.baseline = median(ys);
          this.bodyHNorm = bodyH;
          this.thr = Math.max(0.004, this.thrFrac * bodyH);
          this.state = "ready";
          this.prev = f;
          return true;
        }
      }
      return false;
    }

    if (this.state === "ready") {
      const above = this.baseline - f.footY > this.thr;
      if (above) {
        this.aboveCount++;
        if (this.aboveCount === 1) {
          this.firstAbove = f;
          this.lastBelow = this.prev;
        }
        if (this.aboveCount >= 2 && this.firstAbove && this.lastBelow) {
          this.takeoff = this.cross(this.lastBelow, this.firstAbove);
          this.state = "airborne";
          this.prev = f;
          return true;
        }
      } else {
        this.aboveCount = 0;
        this.firstAbove = null;
      }
      this.prev = f;
      return false;
    }

    if (this.state === "airborne") {
      const above = this.baseline - f.footY > this.thr;
      if (!above && this.prev) {
        const landing = this.cross(this.prev, f);
        // Eşik geçişleri uçuşun başını/sonunu kısaltır; parabolik uçuşta bu sapma kapalı formda düzeltilir:
        // T = sqrt(t_üstünde² + 8·eşik_yüksekliği/g)
        const above = (landing - this.takeoff) / 1000;
        const thrMeters = this.thr * (this.bodyMeters / Math.max(this.bodyHNorm, 0.2));
        const flight = Math.sqrt(above * above + (8 * thrMeters) / G);
        if (flight < this.minFlight || flight > this.maxFlight) {
          this.state = "invalid";
          this.reason = flight < this.minFlight ? "Çok kısa: sıçrama algılanmadı (ayaklar yeterince kalkmadı)." : "Çok uzun: ayaklar zemine dönmedi, tekrar deneyin.";
        } else {
          this.result = {
            takeoffMs: this.takeoff,
            landingMs: landing,
            flightSeconds: Math.round(flight * 1000) / 1000,
            heightCm: Math.round(heightFromFlight(flight) * 10) / 10,
          };
          this.state = "done";
        }
        return true;
      }
      if (f.t - this.takeoff > this.maxFlight * 1000 * 1.5) {
        this.state = "invalid";
        this.reason = "Ayaklar zemine dönmedi, tekrar deneyin.";
        return true;
      }
      this.prev = f;
    }
    return false;
  }

  /** İki kare arasında eşik seviyesinin geçildiği an (doğrusal interpolasyon) */
  private cross(a: JumpFrame, b: JumpFrame): number {
    const level = this.baseline - this.thr;
    const dy = b.footY - a.footY;
    if (Math.abs(dy) < 1e-9) return b.t;
    const r = (level - a.footY) / dy;
    return a.t + Math.max(0, Math.min(1, r)) * (b.t - a.t);
  }
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

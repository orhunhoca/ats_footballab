/**
 * Koşu ve şut tekniği: poz iskeleti (MediaPipe, 33 nokta) zaman serisinden biyomekanik göstergeler.
 * Yan görünümde çekilmiş video varsayılır. Değerler poz tahminine dayanır (yaklaşık); tıbbi/kesin ölçüm değildir.
 */
import type { Landmark } from "@/lib/measure/plankPose";
import { LM } from "@/lib/measure/plankPose";

export interface PoseFrame {
  /** ms (video zaman ekseni) */
  t: number;
  lms: Landmark[];
}

export type TechniqueKind = "run" | "kick";

export interface TechniqueQuality {
  frames: number;
  trackedRatio: number;
  seconds: number;
  ok: boolean;
  note?: string;
}

export interface TechniqueMetric {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  /** değerin kısa açıklaması */
  hint: string;
}

export interface TechniqueResult {
  kind: TechniqueKind;
  quality: TechniqueQuality;
  metrics: TechniqueMetric[];
  /** şut: algılanan vuruş zamanı (ms) ve vuran bacak */
  impactMs?: number;
  kickingLeg?: "sağ" | "sol";
  direction?: "sağa" | "sola";
}

type P = { x: number; y: number };

const vis = (l: Landmark | undefined, min = 0.5) => !!l && (l.visibility ?? 1) >= min;
const toP = (l: Landmark, aspect: number): P => ({ x: l.x * aspect, y: l.y });
const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const deg = (r: number) => (r * 180) / Math.PI;
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const round = (v: number, d = 1) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

function percentile(a: number[], p: number): number {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))];
}

function angleAt(a: P, b: P, c: P): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (m === 0) return NaN;
  return deg(Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / m))));
}

const KEY = [LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle];

function trackedFrames(frames: PoseFrame[]): PoseFrame[] {
  return frames.filter((f) => f.lms && f.lms.length >= 29 && KEY.every((i) => vis(f.lms[i], 0.4)));
}

function quality(frames: PoseFrame[], tracked: PoseFrame[], minFrames: number): TechniqueQuality {
  const seconds = frames.length > 1 ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  const ratio = frames.length ? tracked.length / frames.length : 0;
  let note: string | undefined;
  if (tracked.length < minFrames) note = "Yeterli kare yok: çocuğu baştan ayağa, yandan ve daha uzun çekin.";
  else if (ratio < 0.6) note = "Çocuk karelerin çoğunda tam görünmüyor; güvenilirlik düşük. Daha uzaktan/yandan çekin.";
  return { frames: tracked.length, trackedRatio: Math.round(ratio * 100) / 100, seconds: Math.round(seconds * 10) / 10, ok: !note, note };
}

function smooth(a: number[], w = 2): number[] {
  return a.map((_, i) => mean(a.slice(Math.max(0, i - w), Math.min(a.length, i + w + 1))));
}

/** Gövde eğimi: omuz ortası - kalça ortası çizgisinin düşeyden sapması (+ = ilerleme yönüne eğik) */
function trunkLean(lms: Landmark[], aspect: number, dir: number): number {
  const s = mid(toP(lms[LM.lShoulder], aspect), toP(lms[LM.rShoulder], aspect));
  const h = mid(toP(lms[LM.lHip], aspect), toP(lms[LM.rHip], aspect));
  return deg(Math.atan2((s.x - h.x) * dir, h.y - s.y));
}

// ───────────────────────────────────────────────────────────── KOŞU
export function analyzeRun(frames: PoseFrame[], aspect: number): TechniqueResult {
  const tr = trackedFrames(frames);
  const q = quality(frames, tr, 20);
  const metrics: TechniqueMetric[] = [];
  if (tr.length < 8) return { kind: "run", quality: q, metrics };

  const third = Math.max(1, Math.floor(tr.length / 3));
  const hipX = (f: PoseFrame) => mid(toP(f.lms[LM.lHip], aspect), toP(f.lms[LM.rHip], aspect)).x;
  const dx = mean(tr.slice(-third).map(hipX)) - mean(tr.slice(0, third).map(hipX));
  const dir = dx >= 0 ? 1 : -1;

  const leans = tr.map((f) => trunkLean(f.lms, aspect, dir));
  const thighFwd = (f: PoseFrame, hipI: number, kneeI: number) => {
    const h = toP(f.lms[hipI], aspect);
    const k = toP(f.lms[kneeI], aspect);
    return deg(Math.atan2((k.x - h.x) * dir, k.y - h.y)); // 0 = düz aşağı, 90 = yatay ileri
  };
  const lThigh = tr.map((f) => thighFwd(f, LM.lHip, LM.lKnee));
  const rThigh = tr.map((f) => thighFwd(f, LM.rHip, LM.rKnee));
  const lPeak = percentile(lThigh, 0.95);
  const rPeak = percentile(rThigh, 0.95);

  const elbows: number[] = [];
  for (const f of tr) {
    for (const [s, e, w] of [[LM.lShoulder, LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow, LM.rWrist]] as const) {
      if (vis(f.lms[s], 0.4) && vis(f.lms[e], 0.4) && vis(f.lms[w], 0.4)) {
        elbows.push(angleAt(toP(f.lms[s], aspect), toP(f.lms[e], aspect), toP(f.lms[w], aspect)));
      }
    }
  }

  // Adım sayısı: iki ayak bileğinin ilerleme yönündeki farkının işaret değiştirmesi (her geçiş = 1 adım)
  const sep = smooth(tr.map((f) => (toP(f.lms[LM.lAnkle], aspect).x - toP(f.lms[LM.rAnkle], aspect).x) * dir), 1);
  const amp = percentile(sep.map(Math.abs), 0.8) * 0.15;
  let steps = 0;
  let lastSign = 0;
  for (const v of sep) {
    if (Math.abs(v) < amp) continue;
    const sg = Math.sign(v);
    if (lastSign !== 0 && sg !== lastSign) steps++;
    lastSign = sg;
  }
  const seconds = (tr[tr.length - 1].t - tr[0].t) / 1000;
  const cadence = seconds > 0 ? steps / seconds : NaN;

  metrics.push(
    { key: "trunk_lean", label: "Gövde eğimi (ortalama)", value: round(mean(leans)), unit: "°", hint: "+ ilerleme yönüne eğik; − geriye yaslanma" },
    { key: "knee_lift", label: "Diz kaldırma (en yüksek)", value: round(Math.max(lPeak, rPeak)), unit: "°", hint: "Uyluğun düşeyden ileri açısı; 90° ≈ uyluk yere paralel" },
    { key: "knee_symmetry", label: "Sağ/sol diz simetrisi", value: round(Math.min(lPeak, rPeak) / Math.max(lPeak, rPeak, 1e-6), 2), unit: "oran", hint: "1,00 = iki bacak eşit" },
    { key: "elbow_angle", label: "Dirsek açısı (ortalama)", value: round(mean(elbows)), unit: "°", hint: "Koşuda yaklaşık 80–110° beklenir" },
    { key: "elbow_range", label: "Kol sallama aralığı", value: round(percentile(elbows, 0.95) - percentile(elbows, 0.05)), unit: "°", hint: "Büyük aralık = daha aktif kol" },
    { key: "cadence", label: "Adım sıklığı", value: round(cadence, 1), unit: "adım/sn", hint: "Koşu hızıyla artar; çocuklarda yaklaşık 3–4,5" }
  );
  return { kind: "run", quality: q, metrics, direction: dir > 0 ? "sağa" : "sola" };
}

// ───────────────────────────────────────────────────────────── ŞUT
export function analyzeKick(frames: PoseFrame[], aspect: number): TechniqueResult {
  const tr = trackedFrames(frames);
  const q = quality(frames, tr, 12);
  const metrics: TechniqueMetric[] = [];
  if (tr.length < 8) return { kind: "kick", quality: q, metrics };

  const torso = median(
    tr.map((f) => dist(mid(toP(f.lms[LM.lShoulder], aspect), toP(f.lms[LM.rShoulder], aspect)), mid(toP(f.lms[LM.lHip], aspect), toP(f.lms[LM.rHip], aspect))))
  );
  const legLen = median(
    tr.map((f) => (dist(toP(f.lms[LM.lHip], aspect), toP(f.lms[LM.lAnkle], aspect)) + dist(toP(f.lms[LM.rHip], aspect), toP(f.lms[LM.rAnkle], aspect))) / 2)
  );
  if (!(torso > 0) || !(legLen > 0)) return { kind: "kick", quality: { ...q, ok: false, note: "Vücut ölçüleri hesaplanamadı." }, metrics };

  // Ayak bileği hızı (gövde boyu / sn) — en hızlı ayak bileği vuran ayak, en hızlı an vuruş
  let best = { speed: 0, idx: 1, left: false };
  for (let i = 1; i < tr.length; i++) {
    const dt = (tr[i].t - tr[i - 1].t) / 1000;
    if (dt <= 0 || dt > 0.25) continue;
    for (const [ai, left] of [[LM.lAnkle, true], [LM.rAnkle, false]] as const) {
      const sp = dist(toP(tr[i].lms[ai], aspect), toP(tr[i - 1].lms[ai], aspect)) / dt / torso;
      if (sp > best.speed) best = { speed: sp, idx: i, left };
    }
  }
  if (best.speed <= 0) return { kind: "kick", quality: { ...q, ok: false, note: "Vuruş hareketi algılanamadı." }, metrics };

  const idx = best.idx;
  const kickI = best.left ? { h: LM.lHip, k: LM.lKnee, a: LM.lAnkle } : { h: LM.rHip, k: LM.rKnee, a: LM.rAnkle };
  const plantI = best.left ? { h: LM.rHip, k: LM.rKnee, a: LM.rAnkle } : { h: LM.lHip, k: LM.lKnee, a: LM.lAnkle };
  const f = tr[idx];
  const prevF = tr[Math.max(0, idx - 1)];
  const dirSign = Math.sign(toP(f.lms[kickI.a], aspect).x - toP(prevF.lms[kickI.a], aspect).x) || 1;

  const kneeAng = (fr: PoseFrame) => angleAt(toP(fr.lms[kickI.h], aspect), toP(fr.lms[kickI.k], aspect), toP(fr.lms[kickI.a], aspect));
  const impactT = f.t;
  const before = tr.filter((fr) => fr.t >= impactT - 700 && fr.t <= impactT);
  const after = tr.filter((fr) => fr.t > impactT && fr.t <= impactT + 450);

  const hipImpact = mid(toP(f.lms[LM.lHip], aspect), toP(f.lms[LM.rHip], aspect));
  const plantA = toP(f.lms[plantI.a], aspect);
  const plantOffset = ((plantA.x - hipImpact.x) * dirSign) / legLen; // + önde, − arkada
  const followH = after.length
    ? Math.max(...after.map((fr) => (mid(toP(fr.lms[LM.lHip], aspect), toP(fr.lms[LM.rHip], aspect)).y - toP(fr.lms[kickI.a], aspect).y) / legLen))
    : NaN;

  metrics.push(
    { key: "swing_speed", label: "Bacak savurma hızı (zirve)", value: round(best.speed, 1), unit: "gövde/sn", hint: "Ayak bileği hızı, gövde boyuna göre (kamera uzaklığından bağımsız)" },
    { key: "backswing_knee", label: "Geri çekiş diz açısı (en küçük)", value: round(before.length ? Math.min(...before.map(kneeAng)) : NaN), unit: "°", hint: "Küçük = diz iyi bükülmüş (güçlü geri çekiş)" },
    { key: "impact_knee", label: "Vuruş anı diz açısı", value: round(kneeAng(f)), unit: "°", hint: "180° = bacak tam gerili" },
    { key: "plant_offset", label: "Dayanak ayağı konumu (kalçaya göre)", value: round(plantOffset, 2), unit: "bacak boyu", hint: "0 civarı = kalçanın hizasında; − arkada; + önde" },
    { key: "trunk_lean", label: "Vuruş anı gövde eğimi", value: round(trunkLean(f.lms, aspect, dirSign)), unit: "°", hint: "+ ileri eğik; − geriye yaslanık" },
    { key: "follow_through", label: "Vuruş sonrası bacak yüksekliği", value: round(followH, 2), unit: "bacak boyu", hint: "Kalçanın üstü = bacak vuruştan sonra devam etmiş" }
  );
  return {
    kind: "kick",
    quality: q,
    metrics,
    impactMs: impactT,
    kickingLeg: best.left ? "sol" : "sağ",
    direction: dirSign > 0 ? "sağa" : "sola",
  };
}

function median(a: number[]): number {
  return percentile(a, 0.5);
}

// ───────────────────────────────────────────────────────────── KURAL TABANLI GERİ BİLDİRİM
const val = (r: TechniqueResult, k: string) => r.metrics.find((m) => m.key === k)?.value ?? null;

/** Yapay zekâ kullanılamadığında: genel teknik ilkelerine göre kısa, somut geri bildirim (Markdown) */
export function buildRuleTechniqueFeedback(r: TechniqueResult, name?: string): string {
  const L: string[] = [];
  const title = r.kind === "run" ? "Koşu Tekniği" : "Şut Tekniği";
  L.push(`## ${name ? `${name} — ` : ""}${title}`);
  if (!r.quality.ok) {
    L.push(`**Güvenilirlik düşük:** ${r.quality.note ?? "veri yetersiz"}`);
    if (r.metrics.length === 0) return L.join("\n");
  }
  L.push("");
  const good: string[] = [];
  const work: string[] = [];
  if (r.kind === "run") {
    const lean = val(r, "trunk_lean");
    if (lean !== null) (lean >= 3 && lean <= 20 ? good : work).push(lean < 3 ? `Gövde dik/geride (${lean}°): koşarken hafifçe öne eğilmek (yaklaşık 5–15°) hızlanmaya yardım eder.` : lean > 20 ? `Gövde çok öne eğik (${lean}°): dik bir gövdeyle denge ve adım uzunluğu artar.` : `Gövde eğimi uygun (${lean}°).`);
    const knee = val(r, "knee_lift");
    if (knee !== null) (knee >= 55 ? good : work).push(knee >= 55 ? `Diz kaldırma iyi (${knee}°).` : `Diz kaldırma düşük (${knee}°): yüksek diz çalışmaları ve ip atlama ile geliştirilebilir.`);
    const sym = val(r, "knee_symmetry");
    if (sym !== null && sym < 0.8) work.push(`Sağ-sol bacak farklı çalışıyor (simetri ${sym}): zayıf tarafa tek bacak çalışmaları ekleyin.`);
    const el = val(r, "elbow_angle");
    if (el !== null) (el >= 70 && el <= 115 ? good : work).push(el > 115 ? `Kollar fazla açık (${el}°): dirsekleri yaklaşık 90°de tutup kolları ileri-geri sallamayı çalışın.` : el < 70 ? `Dirsekler çok kapalı (${el}°): omuzları gevşetin.` : `Kol duruşu uygun (${el}°).`);
  } else {
    const swing = val(r, "swing_speed");
    if (swing !== null) good.push(`Bacak savurma zirve hızı: ${swing} gövde/sn (zamanla aynı çocukta karşılaştırın).`);
    const back = val(r, "backswing_knee");
    if (back !== null && back > 110) work.push(`Geri çekiş kısa (diz açısı ${back}°): dizi daha fazla bükerek geri çekmek güç artırır.`);
    const plant = val(r, "plant_offset");
    if (plant !== null) (plant >= -0.15 && plant <= 0.35 ? good : work).push(plant < -0.15 ? `Dayanak ayağı geride (${plant}): topun yanına, kalça hizasına basmayı çalışın.` : plant > 0.35 ? `Dayanak ayağı çok önde (${plant}): top yukarı kaçabilir; topun yanına basın.` : `Dayanak ayağı konumu uygun (${plant}).`);
    const lean = val(r, "trunk_lean");
    if (lean !== null && lean < -8) work.push(`Vuruşta gövde geriye yaslanıyor (${lean}°): topun üzerine hafif eğilmek şutu alçak ve isabetli yapar.`);
    const follow = val(r, "follow_through");
    if (follow !== null && follow < 0.1) work.push(`Vuruş sonrası bacak erken duruyor: vuruştan sonra bacağı hedefe doğru devam ettirin.`);
  }
  L.push("### Güçlü yönler");
  (good.length ? good : ["Belirgin bir güçlü yön çıkarılamadı."]).forEach((g) => L.push(`- ${g}`));
  L.push("", "### Geliştirilecek noktalar");
  (work.length ? work : ["Belirgin bir sorun görünmüyor."]).forEach((w) => L.push(`- ${w}`));
  L.push("", "_Bu geri bildirim poz tahminine ve genel teknik ilkelerine dayanır; yaklaşık değerlerdir ve antrenör gözlemini tamamlar._");
  return L.join("\n");
}

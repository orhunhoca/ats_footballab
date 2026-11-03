/**
 * Yaş grubu referans değerleri.
 *
 * ÖNEMLİ: Aşağıdaki sayılar literatürdeki saha testi aralıklarından derlenmiş YAKLAŞIK başlangıç
 * referanslarıdır (kız/erkek karışık, 6–16 yaş). Bilimsel norm tablosu değildir; okulun kendi ölçümleri
 * biriktikçe (aynı yaş, en az SCHOOL_NORM_MIN_N öğrenci) `get_school_norm` ile hesaplanan okul değerleri
 * bunların yerine geçer. Kullanıcıya her zaman kaynağı ("Okul ortalaması" / "Başlangıç referansı") gösterilir.
 */

export type NormLevel = "developing" | "average" | "good" | "excellent";

export const NORM_LEVEL_LABEL: Record<NormLevel, string> = {
  developing: "Gelişmeli",
  average: "Orta",
  good: "İyi",
  excellent: "Çok iyi",
};

/** weak: bunun altı (performans olarak) "Gelişmeli"; median: orta nokta; strong: bunun üstü "Çok iyi".
 *  Süre testlerinde (lower) weak > median > strong sayısal olarak. */
export interface NormRef {
  weak: number;
  median: number;
  strong: number;
  source: "okul" | "referans";
  /** okul normunda örneklem (öğrenci) sayısı */
  n?: number;
}

export const SCHOOL_NORM_MIN_N = 20;

type Anchors = Record<number, number>; // yaş -> medyan
interface RefSpec {
  match: RegExp;
  direction: "lower" | "higher";
  median: Anchors;
  /** weak/strong medyandan oransal sapma (ör. 0.07 → %7) ya da mutlak sapma */
  spread: { rel?: number; abs?: number };
}

const REFERENCE: RefSpec[] = [
  { match: /^10\s?m.*sprint/i, direction: "lower", median: { 6: 2.7, 8: 2.45, 10: 2.25, 12: 2.1, 14: 1.95, 16: 1.88 }, spread: { rel: 0.07 } },
  { match: /^20\s?m.*sprint/i, direction: "lower", median: { 6: 4.8, 8: 4.3, 10: 3.9, 12: 3.6, 14: 3.3, 16: 3.15 }, spread: { rel: 0.07 } },
  { match: /^30\s?m.*sprint/i, direction: "lower", median: { 6: 6.9, 8: 6.0, 10: 5.4, 12: 4.95, 14: 4.55, 16: 4.3 }, spread: { rel: 0.07 } },
  { match: /illinois/i, direction: "lower", median: { 6: 23, 8: 21, 10: 19.5, 12: 18.5, 14: 17.5, 16: 17 }, spread: { rel: 0.06 } },
  { match: /dikey.*s[ıi]çrama/i, direction: "higher", median: { 6: 16, 8: 20, 10: 24, 12: 28, 14: 34, 16: 39 }, spread: { rel: 0.18 } },
  { match: /plank/i, direction: "higher", median: { 6: 25, 8: 35, 10: 45, 12: 60, 14: 80, 16: 100 }, spread: { rel: 0.3 } },
  { match: /otur.*uzan/i, direction: "higher", median: { 6: 9, 8: 9, 10: 9, 12: 8, 14: 9, 16: 10 }, spread: { abs: 5 } },
  { match: /cooper/i, direction: "higher", median: { 6: 1000, 8: 1300, 10: 1600, 12: 1900, 14: 2200, 16: 2400 }, spread: { rel: 0.12 } },
  { match: /shuttle/i, direction: "higher", median: { 6: 12, 8: 22, 10: 32, 12: 42, 14: 52, 16: 60 }, spread: { rel: 0.25 } },
  { match: /yo-?yo/i, direction: "higher", median: { 6: 240, 8: 400, 10: 600, 12: 800, 14: 1100, 16: 1400 }, spread: { rel: 0.3 } },
];

/** Verilen yaşta çapa noktaları arasında doğrusal interpolasyon (6–16 dışı uca sabitlenir) */
function interpolate(anchors: Anchors, age: number): number {
  const ages = Object.keys(anchors).map(Number).sort((a, b) => a - b);
  if (age <= ages[0]) return anchors[ages[0]];
  if (age >= ages[ages.length - 1]) return anchors[ages[ages.length - 1]];
  for (let i = 0; i < ages.length - 1; i++) {
    const a = ages[i];
    const b = ages[i + 1];
    if (age >= a && age <= b) return anchors[a] + ((anchors[b] - anchors[a]) * (age - a)) / (b - a);
  }
  return anchors[ages[0]];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Testin adına göre başlangıç referansı; tanımsız testlerde null */
export function getReferenceNorm(testName: string, age: number | null | undefined): NormRef | null {
  if (!age || age < 4 || age > 20) return null;
  const spec = REFERENCE.find((s) => s.match.test(testName.trim()));
  if (!spec) return null;
  const median = interpolate(spec.median, age);
  const delta = spec.spread.abs ?? median * (spec.spread.rel ?? 0.1);
  // lower: iyi = küçük değer
  const weak = spec.direction === "lower" ? median + delta : median - delta;
  const strong = spec.direction === "lower" ? median - delta : median + delta;
  return { weak: round2(weak), median: round2(median), strong: round2(strong), source: "referans" };
}

/** Değerin normdaki seviyesi (yönü dikkate alır) */
export function evaluateNorm(value: number, direction: "lower" | "higher", norm: NormRef): NormLevel {
  const perf = direction === "lower" ? -value : value;
  const weak = direction === "lower" ? -norm.weak : norm.weak;
  const median = direction === "lower" ? -norm.median : norm.median;
  const strong = direction === "lower" ? -norm.strong : norm.strong;
  if (perf < weak) return "developing";
  if (perf < median) return "average";
  if (perf < strong) return "good";
  return "excellent";
}

export const NORM_SOURCE_LABEL: Record<NormRef["source"], string> = {
  okul: "Okul ortalaması",
  referans: "Başlangıç referansı",
};

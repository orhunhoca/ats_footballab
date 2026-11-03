/**
 * Performans testleri için analiz motoru.
 * - Ölçümleri test bazında özetler (ilk/son/en iyi, değişim yüzdesi, eğilim)
 * - "Düşük değer iyidir" (sprint, çabukluk) ve "yüksek değer iyidir" (sıçrama, plank) ayrımını yapar
 * - Yapay zekâ anahtarı yokken de çalışan, yalnızca gerçek verilere dayanan bir rapor üretir
 */

import { evaluateNorm, getReferenceNorm, NORM_LEVEL_LABEL, NORM_SOURCE_LABEL, type NormLevel, type NormRef } from "@/lib/testNorms";

export interface AnalysisTestRecord {
  test_date: string;
  value: number | string;
  unit?: string | null;
  test_type?: string | null;
  test_protocol_id?: string | null;
  test_protocols?: { name: string; category: string; unit: string; direction?: string | null } | null;
}

export type Trend = "improving" | "declining" | "stable" | "single";

export interface MetricSummary {
  key: string;
  name: string;
  category: string;
  unit: string;
  /** "lower": küçük değer daha iyi (süre), "higher": büyük değer daha iyi */
  direction: "lower" | "higher";
  count: number;
  first: number;
  latest: number;
  best: number;
  firstDate: string;
  latestDate: string;
  /** İşaretli yüzde: pozitif = gelişim, negatif = gerileme (yön dikkate alınır) */
  changePct: number | null;
  trend: Trend;
  isPersonalBest: boolean;
  /** Yaş grubu karşılaştırması (yaş bilinmiyor ya da norm yoksa tanımsız); son ölçüme göre */
  norm?: { level: NormLevel; ref: NormRef };
}

export interface AnalyzeOptions {
  /** Öğrencinin yaşı (norm karşılaştırması için) */
  age?: number | null;
  /** Okulun kendi verisinden hesaplanan normlar: MetricSummary.key (test_protocol_id) -> norm */
  schoolNorms?: Record<string, NormRef>;
}

export interface StudentAnalysis {
  totalTests: number;
  metrics: MetricSummary[];
  improving: MetricSummary[];
  declining: MetricSummary[];
  stable: MetricSummary[];
  singles: MetricSummary[];
  missingCategories: string[];
  firstDate: string | null;
  latestDate: string | null;
}

const STABLE_THRESHOLD_PCT = 2;
const KNOWN_CATEGORIES = ["Hız", "Çeviklik", "Kuvvet", "Dayanıklılık", "Esneklik"];

const LOWER_IS_BETTER_PATTERN = /sprint|çabukluk|illinois|dribbl|slalom|10m|20m|30m|koşu süresi/i;
const TIME_UNITS = ["saniye", "sn", "s", "sec"];

function inferDirection(name: string, category: string, unit: string, rawType?: string | null): "lower" | "higher" {
  const lowerName = `${name} ${rawType ?? ""}`.toLowerCase();
  if (/plank|yo-yo|cooper|shuttle|sıçrama|esneklik|otur|accuracy|coordination/.test(lowerName)) return "higher";
  if (LOWER_IS_BETTER_PATTERN.test(lowerName)) return "lower";
  if (TIME_UNITS.includes(unit.toLowerCase()) && ["Hız", "Çeviklik"].includes(category)) return "lower";
  return "higher";
}

const LEGACY_TYPE_LABELS: Record<string, { name: string; category: string }> = {
  "10m_dribbling": { name: "10m Top Sürme", category: "Çeviklik" },
  "20m_sprint": { name: "20m Sprint", category: "Hız" },
  shooting_accuracy: { name: "Şut İsabeti", category: "Teknik" },
  passing_accuracy: { name: "Pas İsabeti", category: "Teknik" },
  dribbling_cone: { name: "Koni Slalomu", category: "Çeviklik" },
  coordination: { name: "Koordinasyon", category: "Koordinasyon" },
};

export function formatNumber(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function formatUnit(unit: string): string {
  const u = unit.toLowerCase();
  if (u === "saniye") return "sn";
  return unit;
}

function formatDateTr(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("tr-TR");
}

export function analyzeStudentTests(tests: AnalysisTestRecord[], options: AnalyzeOptions = {}): StudentAnalysis {
  const groups = new Map<string, AnalysisTestRecord[]>();
  for (const t of tests) {
    const key = t.test_protocol_id || t.test_protocols?.name || t.test_type || "diger";
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const metrics: MetricSummary[] = [];
  groups.forEach((records, key) => {
    const sorted = [...records]
      .filter((r) => Number.isFinite(Number(r.value)))
      .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
    if (sorted.length === 0) return;

    const sample = sorted[sorted.length - 1];
    const legacy = sample.test_type ? LEGACY_TYPE_LABELS[sample.test_type] : undefined;
    const name = sample.test_protocols?.name || legacy?.name || sample.test_type || "Test";
    const category = sample.test_protocols?.category || legacy?.category || "Diğer";
    const unit = sample.test_protocols?.unit || sample.unit || "";
    const explicit = sample.test_protocols?.direction;
    const direction: "lower" | "higher" =
      explicit === "lower" || explicit === "higher" ? explicit : inferDirection(name, category, unit, sample.test_type);

    const values = sorted.map((r) => Number(r.value));
    const first = values[0];
    const latest = values[values.length - 1];
    const best = direction === "lower" ? Math.min(...values) : Math.max(...values);

    let changePct: number | null = null;
    let trend: Trend = "single";
    if (sorted.length >= 2 && first !== 0) {
      const raw = ((latest - first) / Math.abs(first)) * 100;
      changePct = Math.round((direction === "lower" ? -raw : raw) * 10) / 10;
      trend =
        changePct >= STABLE_THRESHOLD_PCT ? "improving" : changePct <= -STABLE_THRESHOLD_PCT ? "declining" : "stable";
    }

    const ref = options.schoolNorms?.[key] ?? getReferenceNorm(name, options.age);
    const norm = ref ? { level: evaluateNorm(latest, direction, ref), ref } : undefined;

    metrics.push({
      key,
      name,
      category,
      unit,
      direction,
      count: sorted.length,
      first,
      latest,
      best,
      firstDate: sorted[0].test_date,
      latestDate: sorted[sorted.length - 1].test_date,
      changePct,
      trend,
      isPersonalBest: sorted.length >= 2 && latest === best,
      norm,
    });
  });

  const byChange = (a: MetricSummary, b: MetricSummary) => (b.changePct ?? 0) - (a.changePct ?? 0);
  const improving = metrics.filter((m) => m.trend === "improving").sort(byChange);
  const declining = metrics.filter((m) => m.trend === "declining").sort((a, b) => byChange(b, a));
  const stable = metrics.filter((m) => m.trend === "stable");
  const singles = metrics.filter((m) => m.trend === "single");

  const present = new Set(metrics.map((m) => m.category));
  const missingCategories = KNOWN_CATEGORIES.filter((c) => !present.has(c));

  const dates = tests.map((t) => t.test_date).sort();
  return {
    totalTests: tests.length,
    metrics,
    improving,
    declining,
    stable,
    singles,
    missingCategories,
    firstDate: dates[0] ?? null,
    latestDate: dates[dates.length - 1] ?? null,
  };
}

const CATEGORY_ADVICE: Record<string, string> = {
  Hız: "kısa mesafe sprint ve reaksiyon çalışmaları (10–20 m tekrarlı koşular, çıkış çalışmaları)",
  Çeviklik: "yön değiştirme ve koni/merdiven koordinasyon çalışmaları",
  Kuvvet: "vücut ağırlığıyla kuvvet ve pliometrik çalışmalar (sıçrama, core/plank)",
  Dayanıklılık: "aralıklı koşu ve oyun temelli kondisyon çalışmaları",
  Esneklik: "antrenman sonrası düzenli germe ve mobilite rutini",
  Teknik: "top kontrolü, pas ve şut tekrarları",
  Koordinasyon: "denge ve koordinasyon parkurları",
};

function describeChange(m: MetricSummary): string {
  const unit = formatUnit(m.unit);
  const pct = m.changePct === null ? "" : ` (%${formatNumber(Math.abs(m.changePct))} ${m.changePct >= 0 ? "gelişim" : "gerileme"})`;
  return `**${m.name}:** ${formatNumber(m.first)} → ${formatNumber(m.latest)} ${unit}${pct}`;
}

/** Yalnızca kayıtlı ölçümlere dayanan, uydurma içermeyen koç raporu (Markdown). */
export function buildRuleBasedAnalysis(
  studentName: string,
  age: number | null | undefined,
  analysis: StudentAnalysis
): string {
  const lines: string[] = [];
  lines.push(`# ${studentName} İçin Performans Analizi`);
  lines.push("");

  if (analysis.totalTests === 0) {
    lines.push("Bu öğrenci için henüz test kaydı bulunmuyor. Analiz için en az bir test ölçümü ekleyin.");
    return lines.join("\n");
  }

  const range =
    analysis.firstDate && analysis.latestDate && analysis.firstDate !== analysis.latestDate
      ? `${formatDateTr(analysis.firstDate)} – ${formatDateTr(analysis.latestDate)} arasında`
      : analysis.latestDate
        ? `${formatDateTr(analysis.latestDate)} tarihinde`
        : "";

  lines.push("## Genel Değerlendirme");
  const compared = analysis.improving.length + analysis.declining.length + analysis.stable.length;
  lines.push(
    `${age ? `${age} yaşındaki öğrenci için ` : ""}${range} ${analysis.totalTests} ölçüm kaydedilmiş, ${analysis.metrics.length} farklı testte veri var.`
  );
  if (compared > 0) {
    const avg =
      [...analysis.improving, ...analysis.declining, ...analysis.stable].reduce((s, m) => s + (m.changePct ?? 0), 0) /
      compared;
    lines.push(
      `Tekrarlanan ${compared} testin ${analysis.improving.length} tanesinde gelişim, ${analysis.stable.length} tanesinde sabit seyir, ${analysis.declining.length} tanesinde gerileme var. Ortalama değişim: ${avg >= 0 ? "+" : "-"}%${formatNumber(Math.abs(Math.round(avg * 10) / 10))}.`
    );
  } else {
    lines.push("Henüz hiçbir test tekrarlanmadığı için gelişim eğilimi hesaplanamıyor; mevcut değerler başlangıç (referans) ölçümü olarak kabul edilmeli.");
  }
  lines.push("");

  const withNorm = analysis.metrics.filter((m) => m.norm);
  if (withNorm.length > 0) {
    lines.push("## Yaş Grubuna Göre Konum");
    withNorm.forEach((m) => {
      const n = m.norm!;
      lines.push(
        `- **${m.name}:** ${formatNumber(m.latest)} ${formatUnit(m.unit)} — ${NORM_LEVEL_LABEL[n.level]} (${NORM_SOURCE_LABEL[n.ref.source].toLowerCase()}: ortanca ${formatNumber(n.ref.median)} ${formatUnit(m.unit)})`
      );
    });
    lines.push("");
  }

  lines.push("## Güçlü Yönler");
  if (analysis.improving.length > 0) {
    analysis.improving.slice(0, 5).forEach((m) => {
      lines.push(`- ${describeChange(m)}${m.isPersonalBest ? " — kişisel en iyi derece" : ""}`);
    });
  } else {
    lines.push("- Henüz karşılaştırılabilir bir gelişim verisi yok.");
  }
  lines.push("");

  lines.push("## Gelişim Alanları");
  if (analysis.declining.length > 0) {
    analysis.declining.slice(0, 5).forEach((m) => {
      lines.push(`- ${describeChange(m)} — en iyi değer ${formatNumber(m.best)} ${formatUnit(m.unit)}`);
    });
  }
  if (analysis.missingCategories.length > 0) {
    lines.push(`- Henüz ölçülmeyen alanlar: ${analysis.missingCategories.join(", ")}. Bütüncül değerlendirme için bu alanlarda da test yapılması önerilir.`);
  }
  if (analysis.declining.length === 0 && analysis.missingCategories.length === 0) {
    lines.push("- Belirgin bir gerileme görülmüyor.");
  }
  lines.push("");

  lines.push("## Öneriler");
  const focusCategories = Array.from(new Set(analysis.declining.map((m) => m.category)));
  if (focusCategories.length > 0) {
    focusCategories.forEach((c) => {
      lines.push(`- ${c}: haftalık programa ${CATEGORY_ADVICE[c] ?? "hedefli çalışmalar"} eklenebilir.`);
    });
  } else if (analysis.improving.length > 0) {
    lines.push("- Mevcut antrenman düzenini sürdürün; gelişen alanlarda yükü kademeli artırın.");
  }
  if (analysis.singles.length > 0) {
    lines.push(`- Tek ölçümü olan testler (${analysis.singles.map((m) => m.name).join(", ")}) 4–6 hafta sonra tekrarlanarak eğilim takibi başlatılmalı.`);
  }
  if (analysis.latestDate) {
    const days = Math.floor((Date.now() - new Date(analysis.latestDate).getTime()) / 86400000);
    if (days > 60) lines.push(`- Son test ${days} gün önce yapıldı; güncel durum için yeni ölçüm alınması önerilir.`);
  }
  lines.push("");
  lines.push(
    withNorm.length > 0
      ? "_Not: Yaş grubu karşılaştırması okulun kendi ölçümlerinden (yeterli veri varsa) ya da yaklaşık başlangıç referanslarından gelir; bilimsel norm tablosu değildir ve tıbbi değerlendirme yerine geçmez._"
      : "_Not: Bu değerlendirme yalnızca okulda kaydedilen ölçümlere dayanır; yaş grubu normu içermez ve tıbbi değerlendirme yerine geçmez._"
  );
  return lines.join("\n");
}

/** WhatsApp şablon parametreleri satır sonu içeremez; tek satırlık sonuç özeti. */
export function buildResultsLine(analysis: StudentAnalysis, maxLength = 600): string {
  const parts = analysis.metrics.map((m) => {
    const change =
      m.changePct !== null && m.trend !== "stable"
        ? ` (%${formatNumber(Math.abs(m.changePct))} ${m.changePct >= 0 ? "gelişim" : "gerileme"})`
        : "";
    return `${m.name}: ${formatNumber(m.latest)} ${formatUnit(m.unit)}${change}`;
  });
  let out = "";
  for (const p of parts) {
    const next = out ? `${out}; ${p}` : p;
    if (next.length > maxLength - 1) break;
    out = next;
  }
  return out ? `${out}.` : "Kayıtlı test sonucu yok.";
}

/** Veliye gidecek kısa, tek satırlık, olumlu dilli değerlendirme (kural tabanlı). */
export function buildParentSummary(analysis: StudentAnalysis): string {
  if (analysis.metrics.length === 0) return "Henüz değerlendirilecek test sonucu bulunmuyor.";
  const sentences: string[] = [];
  if (analysis.improving.length > 0) {
    const top = analysis.improving[0];
    const cats = Array.from(new Set(analysis.improving.map((m) => m.category))).slice(0, 2);
    sentences.push(
      `${cats.join(" ve ")} alanında gelişim görülüyor (en belirgin: ${top.name}, %${formatNumber(Math.abs(top.changePct ?? 0))}).`
    );
  }
  if (analysis.declining.length > 0) {
    sentences.push(`${analysis.declining[0].name} üzerinde antrenmanlarda ek çalışma yapacağız.`);
  }
  if (sentences.length === 0) {
    sentences.push(
      analysis.stable.length > 0
        ? "Değerler istikrarlı seyrediyor; çalışmalarımıza devam ediyoruz."
        : "Bu ilk ölçümler gelişim takibi için başlangıç değerimiz olacak."
    );
  }
  return sentences.join(" ");
}

/** Edge function'a gönderilecek asgari, kimlik içermeyen özet. */
export function toAiPayload(age: number | null | undefined, analysis: StudentAnalysis) {
  return {
    age: age ?? null,
    metrics: analysis.metrics.map((m) => ({
      name: m.name,
      category: m.category,
      unit: m.unit,
      direction: m.direction,
      count: m.count,
      first: m.first,
      latest: m.latest,
      best: m.best,
      change_pct: m.changePct,
      trend: m.trend,
      first_date: m.firstDate,
      latest_date: m.latestDate,
      norm: m.norm
        ? {
            level: NORM_LEVEL_LABEL[m.norm.level],
            source: NORM_SOURCE_LABEL[m.norm.ref.source],
            median: m.norm.ref.median,
            weak: m.norm.ref.weak,
            strong: m.norm.ref.strong,
            sample_size: m.norm.ref.n ?? null,
          }
        : null,
    })),
    missing_categories: analysis.missingCategories,
  };
}

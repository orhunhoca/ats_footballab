/** Performans testi tanımlama: beceri alanları, ölçüm türleri ve birimler */

export type Skill = "Hız" | "Çeviklik" | "Dayanıklılık" | "Kuvvet" | "Esneklik" | "Denge" | "Koordinasyon" | "Teknik";

export const SKILLS: { value: Skill; label: string; hint: string; color: string }[] = [
  { value: "Hız", label: "Hız (Sürat)", hint: "Kısa mesafede en yüksek hız, çıkış hızlanması", color: "bg-red-100 text-red-700" },
  { value: "Çeviklik", label: "Çeviklik (Çabukluk)", hint: "Yön değiştirme, hızlı ayak çalışması", color: "bg-orange-100 text-orange-700" },
  { value: "Dayanıklılık", label: "Dayanıklılık", hint: "Uzun süre tempoyu koruma, kondisyon", color: "bg-blue-100 text-blue-700" },
  { value: "Kuvvet", label: "Kuvvet / Güç", hint: "Sıçrama, itme, core kuvveti", color: "bg-purple-100 text-purple-700" },
  { value: "Esneklik", label: "Esneklik", hint: "Eklem hareket açıklığı, germe", color: "bg-yellow-100 text-yellow-700" },
  { value: "Denge", label: "Denge", hint: "Tek ayak, dengede durma", color: "bg-teal-100 text-teal-700" },
  { value: "Koordinasyon", label: "Koordinasyon", hint: "El-ayak-göz uyumu, ritim", color: "bg-green-100 text-green-700" },
  { value: "Teknik", label: "Teknik (Top kontrolü)", hint: "Pas, şut, top sürme, top hâkimiyeti", color: "bg-sky-100 text-sky-700" },
];

export const skillColor = (skill: string) => SKILLS.find((s) => s.value === skill)?.color ?? "bg-gray-100 text-gray-700";
export const skillLabel = (skill: string) => SKILLS.find((s) => s.value === skill)?.label ?? skill;

export type MeasureType = "time" | "distance" | "reps" | "height" | "weight" | "score";

export interface MeasureTypeDef {
  value: MeasureType;
  label: string;
  hint: string;
  units: string[];
  /** Önerilen iyi yön; kullanıcı değiştirebilir */
  defaultDirection: "lower" | "higher";
}

export const MEASURE_TYPES: MeasureTypeDef[] = [
  { value: "time", label: "Süre", hint: "Koşu, parkur süresi ya da bir duruşu tutma süresi", units: ["saniye", "dakika"], defaultDirection: "lower" },
  { value: "distance", label: "Mesafe", hint: "Atlama, atış ya da koşu mesafesi", units: ["metre", "cm"], defaultDirection: "higher" },
  { value: "reps", label: "Tekrar / adet", hint: "Belirli sürede yapılan tekrar, pas ya da top sektirme sayısı", units: ["tekrar"], defaultDirection: "higher" },
  { value: "height", label: "Yükseklik / uzanma", hint: "Sıçrama yüksekliği, otur-uzan gibi cm ölçümleri", units: ["cm"], defaultDirection: "higher" },
  { value: "weight", label: "Ağırlık", hint: "Kaldırılan ya da itilen ağırlık", units: ["kg"], defaultDirection: "higher" },
  { value: "score", label: "Puan / isabet", hint: "Hocanın verdiği puan ya da isabet yüzdesi", units: ["puan", "%"], defaultDirection: "higher" },
];

export const measureTypeDef = (t: string | null | undefined) => MEASURE_TYPES.find((m) => m.value === t);

/** Birimden ölçüm türü tahmini (eski testler için) */
export function guessMeasureType(unit: string): MeasureType {
  if (unit === "saniye" || unit === "dakika") return "time";
  if (unit === "metre") return "distance";
  if (unit === "tekrar") return "reps";
  if (unit === "kg") return "weight";
  if (unit === "puan" || unit === "%") return "score";
  return "height";
}

export const DIRECTION_LABEL = {
  lower: "Değer küçüldükçe daha iyi (örn. koşu süresi)",
  higher: "Değer büyüdükçe daha iyi (örn. sıçrama, plank süresi)",
} as const;

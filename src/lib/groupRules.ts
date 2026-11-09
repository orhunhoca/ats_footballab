/** Antrenman grupları: gün, seans, yaş uygunluğu yardımcıları */

/** day_of_week: 0 = Pazar … 6 = Cumartesi (haftanın günleri Pazartesi'den gösterilir) */
export const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 0, label: "Pazar" },
];

export const dayLabel = (d: number) => DAYS.find((x) => x.value === d)?.label ?? "?";
export const hhmm = (t: string) => t.slice(0, 5);

export interface Session {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const formatSession = (s: Session) => `${dayLabel(s.day_of_week)} ${hhmm(s.start_time)}-${hhmm(s.end_time)}`;

/** Haftanın sırasına göre (Pzt→Paz) seansları sıralar */
export function sortSessions<T extends Session>(list: T[]): T[] {
  const order = (d: number) => (d === 0 ? 7 : d);
  return [...list].sort((a, b) => order(a.day_of_week) - order(b.day_of_week) || a.start_time.localeCompare(b.start_time));
}

/** HH:MM + dakika */
export function addMinutes(t: string, minutes: number): string {
  const [h, m] = t.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Yaş aralığına karşılık gelen doğum yılları (en yeni → en eski) */
export function birthYearsForAges(min: number, max: number, now = new Date()): number[] {
  const y = now.getFullYear();
  const out: number[] = [];
  for (let age = min; age <= max; age++) out.push(y - age);
  return out;
}

/** Doğum tarihinden (yoksa kayıtlı yaştan) yaş */
export function ageOf(student: { birth_date?: string | null; age?: number | null }, now = new Date()): number | null {
  if (student.birth_date) {
    const b = new Date(student.birth_date);
    if (!Number.isNaN(b.getTime())) {
      let age = now.getFullYear() - b.getFullYear();
      const had = now.getMonth() > b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() >= b.getDate());
      if (!had) age--;
      return age;
    }
  }
  return typeof student.age === "number" ? student.age : null;
}

/**
 * Öğrenci grubun yaş aralığına uyuyor mu? age_min/age_max varsa onlara (doğum yılına göre: yıl farkı),
 * yoksa eski gruplardaki "target_years" doğum yılı listesine bakılır; hiçbiri yoksa "bilinmiyor" (true).
 */
export function isAgeEligible(
  group: { age_min?: number | null; age_max?: number | null; target_years?: string | null },
  student: { birth_date?: string | null; age?: number | null },
  now = new Date()
): boolean {
  if (group.age_min != null || group.age_max != null) {
    const birthYear = student.birth_date ? new Date(student.birth_date).getFullYear() : null;
    // Takvim yılı farkıyla yaş (U-kategorileri doğum yılına göre işler)
    const age = birthYear ? now.getFullYear() - birthYear : ageOf(student, now);
    if (age == null) return false;
    return age >= (group.age_min ?? 0) && age <= (group.age_max ?? 99);
  }
  if (group.target_years && student.birth_date) {
    const years = group.target_years.split(",").map((y) => y.trim()).filter(Boolean);
    if (years.length > 0) return years.includes(String(new Date(student.birth_date).getFullYear()));
  }
  return true;
}

export interface Occupancy {
  enrolled: number;
  trial_pending: number;
  capacity: number | null;
}

export const occupied = (o: Occupancy | undefined) => (o ? o.enrolled + o.trial_pending : 0);
export const isFull = (o: Occupancy | undefined) => !!o && o.capacity != null && occupied(o) >= o.capacity;
export const remaining = (o: Occupancy | undefined) => (o && o.capacity != null ? Math.max(0, o.capacity - occupied(o)) : null);

/** Veritabanından gelen kontenjan hatasını anlaşılır mesaja çevirir */
export function capacityErrorMessage(error: unknown): string | null {
  const msg = (error as { message?: string })?.message ?? "";
  const i = msg.indexOf("KONTENJAN_DOLU:");
  return i >= 0 ? msg.slice(i + "KONTENJAN_DOLU:".length).trim() : null;
}

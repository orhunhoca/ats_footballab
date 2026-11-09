/**
 * Hatırlatma planlayıcı (saf mantık; ağ/veritabanı yok). Edge Function ve testler kullanır.
 * Girdi: öğrenciler, bakiyeler, deneme öğrencileri, gönderim günlüğü, kurallar → gönderilecek/atlanacak mesajlar.
 */

export type RuleType = "balance" | "health_report" | "registration_form" | "trial_lesson";

export interface Rule {
  rule_type: RuleType;
  enabled: boolean;
  days_before: number | null;
  repeat_days: number | null;
  template_type: string;
}

export interface StudentRow {
  id: string;
  name: string;
  status: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  father_name: string | null;
  father_phone: string | null;
  health_report_submitted: boolean | null;
  registration_form_submitted: boolean | null;
}

export interface BalanceRow {
  student_id: string;
  balance: number;
  overdue_amount: number;
  next_due_date: string | null;
  /** ödenmemiş en eski vade (student_charge_status) */
  earliest_due: string | null;
}

export interface TrialRow {
  id: string;
  name: string;
  parent_name: string;
  parent_phone: string;
  trial_date: string; // YYYY-MM-DD
  status: string;
  /** "U12 Mavi · Pazartesi 18:00-19:00 · Saha 2" gibi hazır özet */
  group_info: string | null;
}

export interface LogRow {
  template_name: string | null;
  recipient_phone: string;
  created_at: string;
  status: string;
  template_variables: Record<string, unknown> | null;
}

export interface PlannedItem {
  rule_type: RuleType;
  template_type: string;
  student_id: string | null;
  student_name: string;
  recipient_name: string;
  phone: string | null;
  variables: Record<string, string>;
  status: "planned" | "skipped";
  reason?: string;
}

/** Türkiye numaralarını 905XXXXXXXXX biçimine çevirir; geçersizse null. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits;
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

/** Önce anne, yoksa baba (geçerli telefonu olan) */
export function pickParent(s: Pick<StudentRow, "mother_name" | "mother_phone" | "father_name" | "father_phone">): { name: string; phone: string } | null {
  const m = normalizePhone(s.mother_phone);
  if (m) return { name: s.mother_name?.trim() || "Sayın Veli", phone: m };
  const f = normalizePhone(s.father_phone);
  if (f) return { name: s.father_name?.trim() || "Sayın Veli", phone: f };
  return null;
}

export const formatMoney = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
export const formatDateTr = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
};

const DAY_MS = 86_400_000;
const dayDiff = (iso: string, today: Date) =>
  Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY_MS);

function alreadySent(log: LogRow[], template: string, phone: string, within: number | null, now: Date, trialDate?: string): boolean {
  return log.some((l) => {
    if (l.template_name !== template || l.recipient_phone !== phone || l.status === "failed") return false;
    if (trialDate !== undefined) return String(l.template_variables?.trial_date ?? "") === trialDate;
    if (within == null) return true;
    return now.getTime() - new Date(l.created_at).getTime() < within * DAY_MS;
  });
}

export interface PlanInput {
  rules: Rule[];
  students: StudentRow[];
  balances: BalanceRow[];
  trials: TrialRow[];
  log: LogRow[];
  now: Date;
  /** yalnız açık kurallar mı (cron) yoksa hepsi mi (önizleme) */
  onlyEnabled: boolean;
}

export function planReminders(input: PlanInput): Record<RuleType, PlannedItem[]> {
  const { rules, students, balances, trials, log, now, onlyEnabled } = input;
  const out: Record<RuleType, PlannedItem[]> = { balance: [], health_report: [], registration_form: [], trial_lesson: [] };
  const active = students.filter((s) => s.status === "Aktif");
  const byId = new Map(students.map((s) => [s.id, s]));

  for (const rule of rules) {
    if (onlyEnabled && !rule.enabled) continue;
    const items = out[rule.rule_type];
    const push = (it: Omit<PlannedItem, "template_type" | "rule_type" | "status"> & { skipReason?: string }) => {
      const { skipReason, ...rest } = it;
      items.push({ ...rest, rule_type: rule.rule_type, template_type: rule.template_type, status: skipReason ? "skipped" : "planned", reason: skipReason });
    };

    if (rule.rule_type === "balance") {
      const limit = rule.days_before ?? 7;
      for (const b of balances) {
        const s = byId.get(b.student_id);
        if (!s || s.status !== "Aktif" || !(b.balance > 0)) continue;
        const due = b.earliest_due ?? b.next_due_date;
        // Vadesi geçmiş ya da yaklaşan (limit gün içinde) borçlar
        if (!(b.overdue_amount > 0) && !(due && dayDiff(due, now) <= limit)) continue;
        const parent = pickParent(s);
        const variables = { parent_name: parent?.name ?? "Sayın Veli", student_name: s.name, payment_date: due ? formatDateTr(due) : formatDateTr(now.toISOString()), amount: formatMoney(b.balance) };
        if (!parent) push({ student_id: s.id, student_name: s.name, recipient_name: "-", phone: null, variables, skipReason: "Veli telefonu yok" });
        else if (alreadySent(log, rule.template_type, parent.phone, rule.repeat_days, now)) push({ student_id: s.id, student_name: s.name, recipient_name: parent.name, phone: parent.phone, variables, skipReason: `Son ${rule.repeat_days} günde gönderildi` });
        else push({ student_id: s.id, student_name: s.name, recipient_name: parent.name, phone: parent.phone, variables });
      }
    } else if (rule.rule_type === "health_report" || rule.rule_type === "registration_form") {
      for (const s of active) {
        const missing = rule.rule_type === "health_report" ? !s.health_report_submitted : !s.registration_form_submitted;
        if (!missing) continue;
        const parent = pickParent(s);
        const variables = { parent_name: parent?.name ?? "Sayın Veli", student_name: s.name };
        if (!parent) push({ student_id: s.id, student_name: s.name, recipient_name: "-", phone: null, variables, skipReason: "Veli telefonu yok" });
        else if (alreadySent(log, rule.template_type, parent.phone, rule.repeat_days, now)) push({ student_id: s.id, student_name: s.name, recipient_name: parent.name, phone: parent.phone, variables, skipReason: `Son ${rule.repeat_days} günde gönderildi` });
        else push({ student_id: s.id, student_name: s.name, recipient_name: parent.name, phone: parent.phone, variables });
      }
    } else if (rule.rule_type === "trial_lesson") {
      const before = rule.days_before ?? 1;
      for (const t of trials) {
        if (t.status !== "Beklemede") continue;
        const diff = dayDiff(t.trial_date, now);
        if (diff !== before) continue; // tam "N gün önce" günü
        const phone = normalizePhone(t.parent_phone);
        const date = formatDateTr(t.trial_date);
        const variables = { parent_name: t.parent_name?.trim() || "Sayın Veli", student_name: t.name, trial_date: date, group_info: t.group_info || "antrenman saatimizde" };
        if (!phone) push({ student_id: null, student_name: t.name, recipient_name: variables.parent_name, phone: null, variables, skipReason: "Veli telefonu yok" });
        else if (alreadySent(log, rule.template_type, phone, null, now, date)) push({ student_id: null, student_name: t.name, recipient_name: variables.parent_name, phone, variables, skipReason: "Bu deneme için gönderildi" });
        else push({ student_id: null, student_name: t.name, recipient_name: variables.parent_name, phone, variables });
      }
    }
  }
  return out;
}

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { groupService } from "@/services/groupService";
import { isFull } from "@/lib/groupRules";

export type RuleType = "balance" | "health_report" | "registration_form" | "trial_lesson";
export type ReminderRule = Tables<"reminder_rules">;

export interface ParentContact {
  name: string;
  phone: string;
}

export interface StudentItem {
  id: string;
  name: string;
  branch_id: string | null;
  mother: ParentContact | null;
  father: ParentContact | null;
}

export interface DebtItem extends StudentItem {
  balance: number;
  overdue: number;
  earliestDue: string | null;
}

export interface TrialItem {
  id: string;
  name: string;
  parent: ParentContact | null;
  trialDate: string;
  groupName: string | null;
}

export interface ExpiryItem extends StudentItem {
  endDate: string;
  daysLeft: number;
}

export interface Overview {
  trials: TrialItem[];
  debts: DebtItem[];
  healthMissing: StudentItem[];
  formMissing: StudentItem[];
  kvkkMissing: StudentItem[];
  expiring: ExpiryItem[];
  fullGroups: string[];
}

const contact = (name: string | null, phone: string | null): ParentContact | null => (phone && phone.replace(/\D/g, "").length >= 10 ? { name: name?.trim() || "Sayın Veli", phone } : null);

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const reminderService = {
  /** Bildirim Merkezi verisi (yalnız yönetim: borç ve iletişim bilgileri içerir) */
  async getOverview(branchId?: string | null): Promise<Overview> {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 6);

    let sq = supabase
      .from("students")
      .select("id, name, branch_id, mother_name, mother_phone, father_name, father_phone, health_report_submitted, registration_form_submitted, kvkk_consent_at, registration_end_date")
      .eq("status", "Aktif");
    let tq = supabase
      .from("trial_students")
      .select("id, name, parent_name, parent_phone, trial_date, assigned_group_id, branch_id")
      .eq("status", "Beklemede")
      .gte("trial_date", isoDay(today))
      .lte("trial_date", isoDay(weekEnd))
      .order("trial_date", { ascending: true });
    if (branchId) {
      sq = sq.eq("branch_id", branchId);
      tq = tq.eq("branch_id", branchId);
    }

    const [sRes, tRes, bRes, dRes, groups, occ] = await Promise.all([
      sq,
      tq,
      supabase.from("student_balances").select("student_id, balance, overdue_amount").gt("balance", 0),
      supabase.from("student_charge_status").select("student_id, due_date").gt("remaining_amount", 0),
      groupService.getAllGroups(branchId).catch(() => []),
      groupService.getOccupancy().catch(() => ({})),
    ]);
    if (sRes.error) throw sRes.error;
    if (tRes.error) throw tRes.error;
    if (bRes.error) throw bRes.error;

    const students = sRes.data ?? [];
    const toItem = (s: (typeof students)[number]): StudentItem => ({
      id: s.id,
      name: s.name,
      branch_id: s.branch_id,
      mother: contact(s.mother_name, s.mother_phone),
      father: contact(s.father_name, s.father_phone),
    });

    const earliest = new Map<string, string>();
    for (const d of dRes.data ?? []) {
      const cur = earliest.get(d.student_id);
      if (!cur || d.due_date < cur) earliest.set(d.student_id, d.due_date);
    }
    const byId = new Map(students.map((s) => [s.id, s]));
    const debts: DebtItem[] = (bRes.data ?? [])
      .filter((b) => byId.has(b.student_id))
      .map((b) => ({ ...toItem(byId.get(b.student_id)!), balance: Number(b.balance), overdue: Number(b.overdue_amount ?? 0), earliestDue: earliest.get(b.student_id) ?? null }))
      .sort((a, b) => b.overdue - a.overdue || b.balance - a.balance);

    const groupName = new Map((groups as { id: string; name: string }[]).map((g) => [g.id, g.name]));
    const trials: TrialItem[] = (tRes.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      parent: contact(t.parent_name, t.parent_phone),
      trialDate: t.trial_date,
      groupName: t.assigned_group_id ? groupName.get(t.assigned_group_id) ?? null : null,
    }));

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiring: ExpiryItem[] = students
      .filter((s) => s.registration_end_date)
      .map((s) => ({ ...toItem(s), endDate: s.registration_end_date as string, daysLeft: Math.round((new Date(s.registration_end_date as string).getTime() - startOfToday) / 86_400_000) }))
      .filter((s) => s.daysLeft <= 20)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      trials,
      debts,
      healthMissing: students.filter((s) => !s.health_report_submitted).map(toItem),
      formMissing: students.filter((s) => !s.registration_form_submitted).map(toItem),
      kvkkMissing: students.filter((s) => !s.kvkk_consent_at).map(toItem),
      expiring,
      fullGroups: (groups as { id: string; name: string; status: string | null }[]).filter((g) => g.status === "Aktif" && isFull((occ as Record<string, never>)[g.id])).map((g) => g.name),
    };
  },

  async getRules(): Promise<ReminderRule[]> {
    const { data, error } = await supabase.from("reminder_rules").select("*");
    if (error) throw error;
    const order: RuleType[] = ["balance", "health_report", "registration_form", "trial_lesson"];
    return (data ?? []).sort((a, b) => order.indexOf(a.rule_type as RuleType) - order.indexOf(b.rule_type as RuleType));
  },

  async updateRule(type: RuleType, patch: Partial<Pick<ReminderRule, "enabled" | "days_before" | "repeat_days">>): Promise<void> {
    const { error } = await supabase.from("reminder_rules").update({ ...patch, updated_at: new Date().toISOString() }).eq("rule_type", type);
    if (error) throw error;
  },

  /** Edge Function: önizleme (kimseye gönderilmez) ya da şimdi gönder (açık kurallar, WhatsApp bağlıysa) */
  async run(mode: "preview" | "send") {
    const { data, error } = await supabase.functions.invoke("send-reminders", { body: { mode } });
    if (error || data?.success !== true) {
      let message = data?.error as string | undefined;
      const ctx = (error as { context?: Response } | null)?.context;
      if (!message && ctx && typeof ctx.json === "function") {
        try {
          message = (await ctx.json())?.error;
        } catch {
          /* gövde okunamadı */
        }
      }
      throw new Error(message || error?.message || "Hatırlatma servisi yanıt vermedi");
    }
    return data as {
      mode: "preview" | "send";
      whatsapp_active: boolean;
      sent: number;
      failed: number;
      note?: string;
      rules: {
        rule_type: RuleType;
        enabled: boolean;
        planned: number;
        skipped: number;
        items: { student_name: string; recipient_name: string; phone: string | null; status: string; reason: string | null; result: string | null; error: string | null; variables: Record<string, string> }[];
      }[];
    };
  },
};

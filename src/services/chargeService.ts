import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StudentChargeStatus = Database["public"]["Views"]["student_charge_status"]["Row"];
export type StudentBalance = Database["public"]["Views"]["student_balances"]["Row"];
export type ChargeType = "registration" | "summer_clothing" | "winter_clothing" | "other";

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  registration: "Kayıt / Aidat",
  summer_clothing: "Yaz Kıyafeti",
  winter_clothing: "Kış Kıyafeti",
  other: "Diğer",
};

export const chargeTypeLabel = (type: string) => CHARGE_TYPE_LABELS[type as ChargeType] ?? type;

export interface InstallmentPlanInput {
  studentId: string;
  chargeType: ChargeType;
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string; // YYYY-MM-DD
  description?: string;
}

/** Tutarı kuruş hassasiyetiyle taksitlere böler; fark son taksite eklenir. */
export function splitAmount(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] += cents - base * count;
  return parts.map((c) => c / 100);
}

/** Başlangıç tarihinden itibaren n ay sonrasının tarihi (ay sonuna taşmayı önler). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export const chargeService = {
  /** Öğrencinin iptal edilmemiş borçları (ödenen/kalan ile) */
  async listCharges(studentId: string): Promise<StudentChargeStatus[]> {
    const { data, error } = await supabase
      .from("student_charge_status")
      .select("*")
      .eq("student_id", studentId)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getBalance(studentId: string): Promise<StudentBalance | null> {
    const { data, error } = await supabase.from("student_balances").select("*").eq("student_id", studentId).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Tüm öğrencilerin bakiyesi (şube filtreli); öğrenci id'sine göre erişim için map döner */
  async getBalances(branchId?: string | null): Promise<Record<string, StudentBalance>> {
    let query = supabase.from("student_balances").select("*");
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;
    if (error) throw error;
    const map: Record<string, StudentBalance> = {};
    for (const row of data || []) map[row.student_id] = row;
    return map;
  },

  /** Tek bir borç kalemi ekler */
  async addCharge(input: {
    studentId: string;
    chargeType: ChargeType;
    amount: number;
    dueDate: string;
    description?: string;
  }): Promise<void> {
    const { error } = await supabase.from("student_charges").insert({
      student_id: input.studentId,
      charge_type: input.chargeType,
      amount: input.amount,
      due_date: input.dueDate,
      description: input.description || null,
    });
    if (error) throw error;
  },

  /** Toplam tutarı eşit taksitlere bölüp aylık vadelerle borç kalemleri oluşturur */
  async createInstallmentPlan(input: InstallmentPlanInput): Promise<void> {
    if (!(input.totalAmount > 0)) throw new Error("Tutar sıfırdan büyük olmalı.");
    const count = Math.max(1, Math.min(36, Math.floor(input.installmentCount)));
    const amounts = splitAmount(input.totalAmount, count);
    const rows = amounts.map((amount, i) => ({
      student_id: input.studentId,
      charge_type: input.chargeType,
      amount,
      due_date: addMonths(input.firstDueDate, i),
      installment_no: count > 1 ? i + 1 : null,
      description: input.description || null,
    }));
    const { error } = await supabase.from("student_charges").insert(rows);
    if (error) throw error;
  },

  /**
   * Kayıtta seçilen plana göre borçları oluşturur. Yinelenmez: öğrencide o türde (iptal edilmiş olsa da)
   * borç varsa o tür atlanır. Oluşturulan kalem sayısını döndürür.
   */
  async ensureCharges(
    studentId: string,
    items: { chargeType: ChargeType; amount: number; dueDate: string; installmentNo?: number | null; description?: string }[],
  ): Promise<number> {
    const wanted = items.filter((i) => i.amount > 0);
    if (wanted.length === 0) return 0;
    const { data: existing, error } = await supabase.from("student_charges").select("charge_type").eq("student_id", studentId);
    if (error) throw error;
    const have = new Set((existing || []).map((r) => r.charge_type));
    const rows = wanted
      .filter((i) => !have.has(i.chargeType))
      .map((i) => ({
        student_id: studentId,
        charge_type: i.chargeType,
        amount: i.amount,
        due_date: i.dueDate,
        installment_no: i.installmentNo ?? null,
        description: i.description ?? null,
      }));
    if (rows.length === 0) return 0;
    const { error: insertError } = await supabase.from("student_charges").insert(rows);
    if (insertError) throw insertError;
    return rows.length;
  },

  /** Borcu iptal eder (silmez; geçmiş korunur) */
  async cancelCharge(id: string): Promise<void> {
    const { error } = await supabase.from("student_charges").update({ is_cancelled: true }).eq("id", id);
    if (error) throw error;
  },
};

import { supabase } from "@/integrations/supabase/client";

export interface FinanceReport {
  collected: {
    total: number;
    count: number;
    /** payment_type -> tutar (registration, summer_clothing, winter_clothing, other) */
    by_type: Record<string, number>;
    by_method: { method: string; total: number; count: number }[];
  };
  /** Dönem içinde vadesi gelen borçların toplamı */
  due_in_period: number;
  receivable: {
    open_total: number;
    debtors: number;
    overdue_total: number;
    overdue_students: number;
    due_next_30: number;
  };
  registrations: { new: number; renewal: number };
  by_branch: { branch_id: string | null; collected: number; open: number; overdue: number }[];
  top_overdue: { student_id: string; name: string; overdue_amount: number; oldest_due: string | null }[];
}

export type PeriodKey = "last7" | "thisMonth" | "lastMonth" | "last90" | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  last7: "Son 7 gün",
  thisMonth: "Bu ay",
  lastMonth: "Geçen ay",
  last90: "Son 90 gün",
  custom: "Özel aralık",
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Seçilen dönemin başlangıç/bitiş tarihleri (yerel takvim günü, uçlar dahil) */
export function periodRange(key: Exclude<PeriodKey, "custom">, now = new Date()): { from: string; to: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "last7") return { from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: iso(today) };
  if (key === "last90") return { from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89)), to: iso(today) };
  if (key === "thisMonth") return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  return {
    from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
}

export const reportService = {
  /** Gerçek tahsilat (ödemeler) ve alacak (borç kalemleri) özeti; şube verilmezse tüm şubeler */
  async getFinanceReport(from: string, to: string, branchId?: string | null): Promise<FinanceReport> {
    const { data, error } = await supabase.rpc("get_finance_report", { p_from: from, p_to: to, p_branch: branchId ?? null });
    if (error) throw error;
    return data as unknown as FinanceReport;
  },
};

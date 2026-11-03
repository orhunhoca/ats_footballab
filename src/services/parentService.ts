import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LEGAL_VERSION } from "@/lib/legal";

export type ParentInvite = Tables<"parent_invites">;

export interface LinkedParent {
  parent_user_id: string;
  full_name: string | null;
  email: string | null;
  relation: string | null;
  linked_at: string;
  is_active: boolean;
}

export interface MyChild {
  student_id: string;
  name: string;
  relation: string | null;
  branch_name: string | null;
  groups: string[];
}

export interface ChildLedger {
  total_charged: number;
  total_paid: number;
  balance: number;
  overdue_amount: number;
  next_due_date: string | null;
  charges: {
    description: string;
    charge_type: string;
    amount: number;
    due_date: string;
    installment_no: number | null;
    paid_amount: number;
    remaining_amount: number;
    is_overdue: boolean;
  }[];
  payments: { payment_date: string; amount: number; payment_method: string }[];
  bank_accounts: { bank_name: string; account_holder: string; iban: string; description: string | null }[];
}

/** Kayıtta isteğe bağlı açık rıza maddeleri (kabul veya ret kaydedilir) */
export type OptionalConsents = Partial<
  Record<"health" | "media_internal" | "media_social" | "whatsapp" | "commercial" | "abroad", boolean>
>;

/** Fonksiyon hatasındaki gerçek mesajı çıkarır */
async function functionErrorMessage(error: unknown, data: unknown): Promise<string> {
  const body = data as { error?: string } | null;
  if (body?.error) return body.error;
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const parsed = await ctx.json();
      if (parsed?.error) return String(parsed.error);
    } catch {
      /* gövde okunamadı */
    }
  }
  return error instanceof Error ? error.message : "İşlem başarısız oldu";
}

export const parentService = {
  /** Veli kaydı yönetici tarafından açık mı? (giriş yapmadan sorulabilir) */
  async isRegistrationOpen(): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_parent_registration_open");
    if (error) return false;
    return data === true;
  },

  /** Davet kodu ile veli kaydı. KVKK onayı sunucuda da zorunludur. */
  async register(input: {
    code: string;
    fullName: string;
    email: string;
    password: string;
    studentName: string;
    studentBirthDate: string;
    parentPhone: string;
    kvkkAccepted: boolean;
    consents: OptionalConsents;
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke("parent-register", {
      body: {
        code: input.code,
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        studentName: input.studentName,
        studentBirthDate: input.studentBirthDate,
        parentPhone: input.parentPhone,
        kvkk_accepted: input.kvkkAccepted,
        kvkk_version: LEGAL_VERSION,
        consents: input.consents,
      },
    });
    if (error || data?.success !== true) throw new Error(await functionErrorMessage(error, data));
  },

  /** Giriş yapmış veli, yeni bir davet koduyla başka bir çocuğunu bağlar */
  async linkStudent(input: { code: string; studentName: string; studentBirthDate: string; parentPhone: string }): Promise<string | null> {
    const { data, error } = await supabase.functions.invoke("parent-link-student", { body: input });
    if (error || data?.success !== true) throw new Error(await functionErrorMessage(error, data));
    return (data?.studentName as string | null) ?? null;
  },

  async getMyChildren(): Promise<MyChild[]> {
    const { data, error } = await supabase.rpc("get_my_children");
    if (error) throw error;
    return (data as unknown as MyChild[]) || [];
  },

  /** Velinin kendi çocuğunun borç/ödeme özeti ve ödeme yapılabilecek banka hesapları */
  async getChildLedger(studentId: string): Promise<ChildLedger> {
    const { data, error } = await supabase.rpc("get_my_child_ledger", { p_student_id: studentId });
    if (error) throw error;
    return data as unknown as ChildLedger;
  },

  /** Velinin güncel KVKK sürümünü onaylayıp onaylamadığı */
  async hasCurrentKvkkConsent(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("consents")
      .select("accepted")
      .eq("user_id", userId)
      .eq("document_type", "kvkk_aydinlatma")
      .eq("document_version", LEGAL_VERSION)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.accepted === true;
  },

  async acceptCurrentKvkk(userId: string): Promise<void> {
    const { error } = await supabase.from("consents").insert({
      user_id: userId,
      document_type: "kvkk_aydinlatma",
      document_version: LEGAL_VERSION,
      accepted: true,
      source: "portal",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
    if (error) throw error;
  },

  // ---- Yönetim (admin + yönetici) ----

  /** Yeni davet kodu üretir (eskiler iptal olur). Kod yalnızca bu çağrıda görülebilir. */
  async createInvite(studentId: string, maxUses = 2, days = 14): Promise<string> {
    const { data, error } = await supabase.rpc("create_parent_invite", {
      p_student_id: studentId,
      p_max_uses: maxUses,
      p_days: days,
    });
    if (error) throw error;
    return data as string;
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc("revoke_parent_invite", { p_invite_id: inviteId });
    if (error) throw error;
  },

  async listInvites(studentId: string): Promise<ParentInvite[]> {
    const { data, error } = await supabase
      .from("parent_invites")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  },

  async listStudentParents(studentId: string): Promise<LinkedParent[]> {
    const { data, error } = await supabase.rpc("list_student_parents", { p_student_id: studentId });
    if (error) throw error;
    return data || [];
  },

  async unlinkParent(parentUserId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from("parent_students")
      .delete()
      .eq("parent_user_id", parentUserId)
      .eq("student_id", studentId);
    if (error) throw error;
  },
};

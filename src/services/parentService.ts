import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LEGAL_VERSION } from "@/lib/legal";
import type { AnalysisTestRecord } from "@/lib/performanceAnalysis";

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

export interface ChildAttendance {
  present: number;
  absent: number;
  excused: number;
  total: number;
  records: { date: string; status: string; group_name: string | null }[];
}

export interface ChildGallery {
  consent: boolean;
  items: { id: string; path: string; caption: string | null; created_at: string }[];
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

  async getChildAttendance(studentId: string): Promise<ChildAttendance> {
    const { data, error } = await supabase.rpc("get_my_child_attendance", { p_student_id: studentId });
    if (error) throw error;
    return data as unknown as ChildAttendance;
  },

  /** Performans testleri (analiz motoruna doğrudan verilebilir biçimde) */
  async getChildPerformance(studentId: string): Promise<AnalysisTestRecord[]> {
    const { data, error } = await supabase.rpc("get_my_child_performance", { p_student_id: studentId });
    if (error) throw error;
    return (data as unknown as AnalysisTestRecord[]) || [];
  },

  async getChildGallery(studentId: string): Promise<ChildGallery> {
    const { data, error } = await supabase.rpc("get_my_child_gallery", { p_student_id: studentId });
    if (error) throw error;
    return data as unknown as ChildGallery;
  },

  /** Galeri fotoğrafları özel depoda; 1 saat geçerli imzalı bağlantılar üretir (path -> url) */
  async signGalleryUrls(paths: string[]): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await supabase.storage.from("gallery").createSignedUrls(paths, 3600);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data || []) if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
    return map;
  },

  /** Velinin okul içi fotoğraf/video paylaşımı onayını kaydeder (en son kayıt geçerlidir) */
  async setMediaConsent(userId: string, accepted: boolean): Promise<void> {
    const { error } = await supabase.from("consents").insert({
      user_id: userId,
      document_type: "acik_riza_medya_ici",
      document_version: LEGAL_VERSION,
      accepted,
      source: "portal",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
    if (error) throw error;
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

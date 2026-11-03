import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";
import { isValidTrIban, normalizeIban } from "@/lib/iban";

export type CompanySettings = Tables<"company_settings">;
export type BankAccount = Tables<"bank_accounts">;
type BankAccountInsert = Database["public"]["Tables"]["bank_accounts"]["Insert"];

/** Giriş yapmadan görülen hukuki sayfalar için kamuya açık şirket bilgileri (vergi bilgisi içermez) */
export interface PublicCompanyInfo {
  legal_name?: string | null;
  mersis_no?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  kep_address?: string | null;
  website?: string | null;
  kvkk_contact_email?: string | null;
  verbis_number?: string | null;
}

export type CompanyFormValues = Pick<
  CompanySettings,
  | "legal_name"
  | "tax_office"
  | "tax_number"
  | "mersis_no"
  | "address"
  | "phone"
  | "email"
  | "kep_address"
  | "website"
  | "kvkk_contact_email"
  | "verbis_number"
>;

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export const companyService = {
  async getPublicInfo(): Promise<PublicCompanyInfo> {
    const { data, error } = await supabase.rpc("get_public_company_info");
    if (error) {
      console.error("Şirket bilgisi alınamadı:", error);
      return {};
    }
    return (data as PublicCompanyInfo) || {};
  },

  async getCompany(): Promise<CompanySettings | null> {
    const { data, error } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
    if (error) {
      console.error("Şirket ayarları okunamadı:", error);
      throw error;
    }
    return data;
  },

  async saveCompany(id: string, values: CompanyFormValues): Promise<void> {
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, clean(v as string | null)])
    ) as CompanyFormValues;
    const { error } = await supabase
      .from("company_settings")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async getBankAccounts(): Promise<BankAccount[]> {
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Banka hesapları okunamadı:", error);
      throw error;
    }
    return data || [];
  },

  async saveBankAccount(
    input: Pick<BankAccountInsert, "bank_name" | "account_holder" | "iban" | "bank_branch" | "description" | "branch_id">,
    id?: string
  ): Promise<void> {
    const iban = normalizeIban(input.iban);
    if (!isValidTrIban(iban)) throw new Error("IBAN geçerli değil. TR ile başlayan 26 haneli IBAN girin.");
    const payload = {
      bank_name: input.bank_name.trim(),
      account_holder: input.account_holder.trim(),
      iban,
      bank_branch: clean(input.bank_branch),
      description: clean(input.description),
      branch_id: input.branch_id || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = id
      ? await supabase.from("bank_accounts").update(payload).eq("id", id)
      : await supabase.from("bank_accounts").insert(payload);
    if (error) {
      if (error.code === "23505") throw new Error("Bu IBAN zaten kayıtlı.");
      throw error;
    }
  },

  async setBankAccountActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("bank_accounts")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteBankAccount(id: string): Promise<void> {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) throw error;
  },
};

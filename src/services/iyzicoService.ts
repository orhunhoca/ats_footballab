import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Sırlar (api_key, secret_key) istemciden okunamaz; yalnızca yazılabilir.
type IyzicoSettings = Pick<
  Database["public"]["Tables"]["iyzico_settings"]["Row"],
  "id" | "base_url" | "is_active" | "created_at" | "updated_at"
>;
const IYZICO_PUBLIC_COLUMNS = "id, base_url, is_active, created_at, updated_at";
type OnlinePayment = Database["public"]["Tables"]["online_payments"]["Row"];
type OnlinePaymentInsert = Database["public"]["Tables"]["online_payments"]["Insert"];

export interface CreatePaymentLinkParams {
  studentId: string;
  studentName: string;
  amount: number;
  paymentType: string;
  description?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export const iyzicoService = {
  // Get iyzico settings
  async getSettings(): Promise<IyzicoSettings | null> {
    const { data, error } = await supabase
      .from("iyzico_settings")
      .select(IYZICO_PUBLIC_COLUMNS)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching iyzico settings:", error);
      return null;
    }

    return data;
  },

  // Save or update iyzico settings
  async saveSettings(settings: {
    api_key?: string;
    secret_key?: string;
    base_url?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Boş bırakılan sır alanları mevcut değerin üzerine yazılmasın
      settings = { ...settings };
      if (!settings.api_key) delete settings.api_key;
      if (!settings.secret_key) delete settings.secret_key;

      const { data: existing } = await supabase
        .from("iyzico_settings")
        .select("id")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("iyzico_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("iyzico_settings")
          .insert([settings]);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving iyzico settings:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings"
      };
    }
  },

  // Ödeme bağlantısı oluşturur. iyzico çağrısı ve online_payments kaydı sunucuda (Edge Function) yapılır;
  // ödeme bitince iyzico, sunucudaki iyzico-callback fonksiyonuna döner ve ödeme kaydı orada (tek sefer) yazılır.
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<{
    success: boolean;
    paymentLink?: string;
    conversationId?: string;
    error?: string;
  }> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.is_active) {
        return { success: false, error: "iyzico entegrasyonu yapılandırılmamış veya aktif değil" };
      }

      const { data, error: functionError } = await supabase.functions.invoke("create-iyzico-payment", {
        body: {
          studentId: params.studentId,
          amount: params.amount,
          paymentType: params.paymentType,
          description: params.description,
        },
      });

      if (functionError || data?.success !== true) {
        const ctx = (functionError as { context?: Response } | null)?.context;
        let message = data?.error as string | undefined;
        if (!message && ctx && typeof ctx.json === "function") {
          try {
            message = (await ctx.json())?.error;
          } catch {
            /* gövde okunamadı */
          }
        }
        throw new Error(message || functionError?.message || "Ödeme linki oluşturulamadı");
      }

      return { success: true, paymentLink: data.paymentPageUrl, conversationId: data.conversationId };
    } catch (error) {
      console.error("Error creating payment link:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Ödeme linki oluşturulamadı"
      };
    }
  },

  // Check payment status
  async checkPaymentStatus(conversationId: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("online_payments")
        .select("*")
        .eq("conversation_id", conversationId)
        .single();

      if (error) throw error;

      return {
        success: true,
        status: data.status
      };
    } catch (error) {
      console.error("Error checking payment status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Durum kontrolü başarısız"
      };
    }
  },

  // Get payment history
  async getPaymentHistory(studentId?: string): Promise<OnlinePayment[]> {
    let query = supabase
      .from("online_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching payment history:", error);
      return [];
    }

    return data || [];
  },

  // Kayıtlı anahtarları sunucuda dener (para hareketi yok). mode: "test" | "canlı"
  async testConnection(): Promise<{
    success: boolean;
    mode?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke("test-iyzico-connection");
      if (error || data?.success !== true) {
        const ctx = (error as { context?: Response } | null)?.context;
        let message = data?.error as string | undefined;
        if (!message && ctx && typeof ctx.json === "function") {
          try {
            message = (await ctx.json())?.error;
          } catch {
            /* gövde okunamadı */
          }
        }
        return { success: false, error: message || error?.message || "Bağlantı testi başarısız" };
      }
      return { success: true, mode: data.mode };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Bağlantı testi başarısız" };
    }
  }
};

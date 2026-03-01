import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type IyzicoSettings = Database["public"]["Tables"]["iyzico_settings"]["Row"];
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
      .select("*")
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

  // Create payment link via Edge Function
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<{
    success: boolean;
    paymentLink?: string;
    conversationId?: string;
    error?: string;
  }> {
    try {
      // Get active settings
      const settings = await this.getSettings();
      if (!settings || !settings.is_active) {
        return {
          success: false,
          error: "iyzico entegrasyonu yapılandırılmamış veya aktif değil"
        };
      }

      // Generate unique conversation ID
      const conversationId = `${params.studentId}-${Date.now()}`;

      // Call Edge Function to create payment with iyzico
      const { data, error: functionError } = await supabase.functions.invoke(
        "create-iyzico-payment",
        {
          body: {
            conversationId,
            amount: params.amount,
            basketId: `BASKET-${Date.now()}`,
            buyer: {
              id: params.studentId,
              name: params.studentName.split(" ")[0] || "Veli",
              surname: params.studentName.split(" ").slice(1).join(" ") || "Kullanıcı",
              email: params.parentEmail || "veli@example.com",
              identityNumber: "11111111111", // TC Kimlik - gerçek sistemde alınmalı
              registrationAddress: "Adres bilgisi", // gerçek sistemde alınmalı
              city: "Istanbul",
              country: "Turkey",
              ip: "85.34.78.112" // Client IP - gerçek sistemde alınmalı
            },
            billingAddress: {
              contactName: params.studentName,
              city: "Istanbul",
              country: "Turkey",
              address: "Adres bilgisi"
            },
            basketItems: [
              {
                id: `ITEM-${Date.now()}`,
                name: params.description || params.paymentType,
                category1: "Spor",
                category2: "Futbol",
                itemType: "VIRTUAL",
                price: params.amount
              }
            ],
            callbackUrl: `${window.location.origin}/api/iyzico-callback`
          }
        }
      );

      if (functionError) {
        throw functionError;
      }

      // Create online_payment record
      const paymentRecord: OnlinePaymentInsert = {
        student_id: params.studentId,
        amount: params.amount,
        payment_type: params.paymentType,
        conversation_id: conversationId,
        payment_link: data.paymentPageUrl,
        token: data.token,
        status: "pending",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat
      };

      const { data: payment, error: insertError } = await supabase
        .from("online_payments")
        .insert(paymentRecord)
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        success: true,
        paymentLink: data.paymentPageUrl,
        conversationId: conversationId
      };
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

  // Update payment status (called by webhook)
  async updatePaymentStatus(
    conversationId: string,
    status: "success" | "failed" | "pending",
    iyzicoPaymentId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (iyzicoPaymentId) {
      updateData.iyzico_payment_id = iyzicoPaymentId;
    }

    if (status === "success") {
      updateData.paid_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from("online_payments")
      .update(updateData)
      .eq("conversation_id", conversationId);

    if (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  },

  // Test iyzico connection
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const settings = await this.getSettings();
      
      if (!settings || !settings.is_active) {
        return {
          success: false,
          error: "iyzico ayarları yapılandırılmamış"
        };
      }

      // Simple test to verify API credentials
      const { error } = await supabase.functions.invoke("test-iyzico-connection");

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Bağlantı testi başarısız"
      };
    }
  }
};
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildPerformanceReportText } from "@/lib/whatsappTemplates";

// Sırlar (access_token, webhook_verify_token) istemciden okunamaz; yalnızca yazılabilir.
type WhatsAppSettings = Pick<
  Database["public"]["Tables"]["whatsapp_settings"]["Row"],
  "id" | "phone_number_id" | "business_account_id" | "is_active" | "created_at" | "updated_at"
>;
const WHATSAPP_PUBLIC_COLUMNS = "id, phone_number_id, business_account_id, is_active, created_at, updated_at";
type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
type WhatsAppMessageInsert = Database["public"]["Tables"]["whatsapp_messages"]["Insert"];
type WhatsAppTemplate = Database["public"]["Tables"]["whatsapp_templates"]["Row"];
type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

interface SendMessageParams {
  phoneNumber: string;
  templateName: string;
  variables: Record<string, string>;
  studentId?: string;
  recipientName?: string;
  /** Gönderilen metnin okunabilir hali (kayıt/denetim için) */
  messagePreview?: string;
  messageType?: "payment_reminder" | "attendance" | "announcement" | "performance_report" | "custom";
  /** Başlığında belge olan şablonlar için PDF bağlantısı (https) */
  headerDocument?: { url: string; filename: string };
}

/** WhatsApp bağlı/aktif değilken fırlatılır (mesaj kuyruğa/kayda alınmaz, "gönderildi" denmez). */
export class WhatsAppNotConnectedError extends Error {
  constructor() {
    super("WhatsApp bağlı değil. Ayarlar → WhatsApp bölümünden bağlantıyı kurun.");
    this.name = "WhatsAppNotConnectedError";
  }
}

/** supabase.functions.invoke hata gövdesindeki gerçek mesajı çıkarır. */
async function extractFunctionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      /* gövde okunamadı */
    }
  }
  return error instanceof Error ? error.message : "Bilinmeyen hata";
}

export const whatsappService = {
  // Get WhatsApp settings
  async getSettings(): Promise<WhatsAppSettings | null> {
    const { data, error } = await supabase
      .from("whatsapp_settings")
      .select(WHATSAPP_PUBLIC_COLUMNS)
      .eq("is_active", true)
      .single();

    if (error) {
      // console.error("Error fetching WhatsApp settings:", error);
      return null;
    }

    return data;
  },

  // Save or update WhatsApp settings
  async saveSettings(settings: {
    phone_number_id?: string;
    access_token?: string;
    business_account_id?: string;
    webhook_verify_token?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Boş bırakılan sır alanları mevcut değerin üzerine yazılmasın
      settings = { ...settings };
      if (!settings.access_token) delete settings.access_token;
      if (!settings.webhook_verify_token) delete settings.webhook_verify_token;

      const { data: existing } = await supabase
        .from("whatsapp_settings")
        .select("id")
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from("whatsapp_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("whatsapp_settings")
          .insert([settings]);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving WhatsApp settings:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save settings"
      };
    }
  },

  // Get all message templates
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching templates:", error);
      return [];
    }

    return data || [];
  },

  // Send WhatsApp message via Edge Function
  async sendMessage(params: SendMessageParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Get active settings
      const settings = await this.getSettings();
      if (!settings || !settings.is_active) {
        return {
          success: false,
          error: new WhatsAppNotConnectedError().message
        };
      }

      // Prepare message record
      const messageRecord: WhatsAppMessageInsert = {
        recipient_phone: params.phoneNumber,
        recipient_name: params.recipientName,
        message_content: params.messagePreview,
        template_name: params.templateName,
        template_variables: params.variables,
        student_id: params.studentId,
        message_type: params.messageType || "custom",
        status: "pending"
      };

      // Insert message record
      const { data: message, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(messageRecord)
        .select()
        .single();

      if (insertError) throw insertError;

      // Call Edge Function to send message
      const { data, error: functionError } = await supabase.functions.invoke(
        "send-whatsapp",
        {
          body: {
            phoneNumber: params.phoneNumber,
            templateName: params.templateName,
            variables: params.variables,
            headerDocument: params.headerDocument,
            messageId: message.id
          }
        }
      );

      if (functionError || data?.success === false) {
        const errorText = functionError
          ? await extractFunctionError(functionError)
          : String(data?.error ?? "Mesaj gönderilemedi");
        // Update message status to failed
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "failed",
            error_message: errorText,
            updated_at: new Date().toISOString()
          })
          .eq("id", message.id);

        return {
          success: false,
          error: errorText
        };
      }

      // Update message status to sent
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "sent",
          whatsapp_message_id: data.messageId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", message.id);

      return {
        success: true,
        messageId: data.messageId
      };
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message"
      };
    }
  },

  // Send payment reminder
  async sendPaymentReminder(
    studentId: string,
    parentPhone: string,
    studentName: string,
    amount: number,
    dueDate: string,
    parentName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const formattedDate = new Date(dueDate).toLocaleDateString("tr-TR");
    const formattedAmount = amount.toLocaleString("tr-TR");

    return this.sendMessage({
      phoneNumber: parentPhone,
      templateName: "payment_reminder",
      // Anahtarlar whatsapp_templates.variables ile birebir aynı olmalı
      variables: {
        parent_name: parentName || "Sayın Veli",
        student_name: studentName,
        payment_date: formattedDate,
        amount: formattedAmount
      },
      studentId,
      recipientName: parentName,
      messageType: "payment_reminder"
    });
  },

  // Send attendance notification
  async sendAttendanceNotification(
    studentId: string,
    parentPhone: string,
    studentName: string,
    attended: boolean,
    date: string,
    parentName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const formattedDate = new Date(date).toLocaleDateString("tr-TR");
    const status = attended ? "katıldı" : "katılmadı";

    return this.sendMessage({
      phoneNumber: parentPhone,
      templateName: "attendance_notification",
      // Şablon gövdesinde tarih yok ("bugünkü antrenman"); date yalnızca kayıt için tutulur
      variables: {
        parent_name: parentName || "Sayın Veli",
        student_name: studentName,
        attendance_status: status
      },
      studentId,
      recipientName: parentName,
      messagePreview: `${studentName} ${formattedDate} tarihli antrenmana ${status}.`,
      messageType: "attendance"
    });
  },

  // Veliye performans test raporu gönder (WhatsApp şablonu: performance_report)
  async sendPerformanceReport(params: {
    studentId: string;
    studentName: string;
    parentName: string;
    phoneNumber: string;
    testDate: string;
    results: string;
    evaluation: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber: params.phoneNumber,
      templateName: "performance_report",
      variables: {
        parent_name: params.parentName,
        student_name: params.studentName,
        test_date: params.testDate,
        results: params.results,
        evaluation: params.evaluation
      },
      studentId: params.studentId,
      recipientName: params.parentName,
      messagePreview: buildPerformanceReportText({
        parentName: params.parentName,
        studentName: params.studentName,
        testDate: params.testDate,
        results: params.results,
        evaluation: params.evaluation
      }),
      messageType: "performance_report"
    });
  },

  // Veliye PDF performans raporu gönder (WhatsApp şablonu: performance_report_pdf, başlıkta PDF)
  async sendPerformanceReportPdf(params: {
    studentId: string;
    studentName: string;
    parentName: string;
    phoneNumber: string;
    testDate: string;
    evaluation: string;
    pdfUrl: string;
    filename: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber: params.phoneNumber,
      templateName: "performance_report_pdf",
      variables: {
        parent_name: params.parentName,
        student_name: params.studentName,
        test_date: params.testDate,
        evaluation: params.evaluation
      },
      headerDocument: { url: params.pdfUrl, filename: params.filename },
      studentId: params.studentId,
      recipientName: params.parentName,
      messagePreview: `[PDF: ${params.filename}] ${params.studentName} için ${params.testDate} tarihli performans raporu. Değerlendirme: ${params.evaluation}`,
      messageType: "performance_report"
    });
  },

  // Belirli türde ve belirli süre içinde başarısız olmamış mesaj gönderilen öğrenciler
  // (aynı mesajı yanlışlıkla ikinci kez göndermemek için)
  async getRecentlySentStudentIds(
    messageType: string,
    studentIds: string[],
    sinceIso: string,
    contentContains?: string
  ): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    let query = supabase
      .from("whatsapp_messages")
      .select("student_id")
      .eq("message_type", messageType)
      .in("student_id", studentIds)
      .neq("status", "failed")
      .gte("created_at", sinceIso);
    if (contentContains) {
      query = query.ilike("message_content", `%${contentContains}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error checking recent messages:", error);
      return new Set();
    }
    return new Set((data || []).map((r) => r.student_id).filter((id): id is string => !!id));
  },

  // Send general announcement
  async sendAnnouncement(
    phoneNumbers: string[],
    announcementText: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendMessage({
        phoneNumber,
        templateName: "general_announcement",
        variables: {
          announcement_text: announcementText
        },
        messageType: "announcement"
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(`${phoneNumber}: ${result.error}`);
      }

      // Add delay to avoid rate limiting (1 message per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success: successCount, failed: failedCount, errors };
  },

  // Send template message (wrapper for sendMessage)
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendMessage({
      phoneNumber,
      templateName,
      variables,
      messageType: "custom"
    });
  },

  // Send custom text message (for scheduled messages)
  async sendCustomMessage(
    phoneNumber: string,
    messageText: string
  ): Promise<WhatsAppMessage> {
    try {
      // Get settings
      const settings = await this.getSettings();
      if (!settings?.is_active) throw new WhatsAppNotConnectedError();

      // Call Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "send-whatsapp",
        {
          body: {
            phoneNumber,
            messageType: "custom",
            messageContent: {
              customText: messageText,
            },
          },
        }
      );

      if (functionError) throw functionError;

      // Record message in database
      const messageRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "custom",
        message_content: messageText,
        status: "sent",
        whatsapp_message_id: functionData?.messageId,
      };

      const { data, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(messageRecord)
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (error) {
      // Bağlantı yoksa başarısız kayıt da oluşturma; hatayı olduğu gibi ilet
      if (error instanceof WhatsAppNotConnectedError) throw error;
      // Record failed message
      const failedRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "custom",
        message_content: messageText,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      };

      await supabase.from("whatsapp_messages").insert(failedRecord);
      throw error;
    }
  },

  // Send document (PDF) via WhatsApp
  async sendDocumentMessage(
    phoneNumber: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<WhatsAppMessage> {
    try {
      // Get settings
      const settings = await this.getSettings();
      
      const messageContent = JSON.stringify({
          document_url: documentUrl,
          filename,
          caption
      });

      if (!settings?.is_active) throw new WhatsAppNotConnectedError();

      // Call Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "send-whatsapp",
        {
          body: {
            phoneNumber,
            messageType: "document",
            messageContent: {
              documentUrl,
              filename,
              caption,
            },
          },
        }
      );

      if (functionError) throw functionError;

      // Record message in database
      const messageRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "document",
        message_content: messageContent,
        status: "sent",
        whatsapp_message_id: functionData?.messageId,
      };

      const { data, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(messageRecord)
        .select()
        .single();

      if (insertError) throw insertError;

      // Record in media table (redundant but kept for gallery/media features)
      await supabase.from("whatsapp_media").insert({
        media_type: "document",
        media_url: documentUrl,
        caption: caption || filename,
      });

      return data;
    } catch (error) {
      // Bağlantı yoksa başarısız kayıt da oluşturma; hatayı olduğu gibi ilet
      if (error instanceof WhatsAppNotConnectedError) throw error;
      // Record failed message
      const failedRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "document",
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      };

      await supabase.from("whatsapp_messages").insert(failedRecord);
      throw error;
    }
  },

  // Send image message
  async sendImageMessage(
    phoneNumber: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppMessage> {
    try {
      // Get settings
      const settings = await this.getSettings();
      
      const messageContent = JSON.stringify({
          image_url: imageUrl,
          caption
      });

      if (!settings?.is_active) throw new WhatsAppNotConnectedError();

      // Call Edge Function (assuming it supports images too)
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "send-whatsapp",
        {
          body: {
            phoneNumber,
            messageType: "image",
            messageContent: {
              imageUrl,
              caption,
            },
          },
        }
      );

      if (functionError) throw functionError;

      // Record in database
      const messageRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "image",
        status: "sent",
        message_content: messageContent,
        whatsapp_message_id: functionData?.messageId,
      };

      const { data, error: insertError } = await supabase.from("whatsapp_messages").insert(messageRecord).select().single();
      
      if (insertError) throw insertError;
      return data;

    } catch (error) {
      if (error instanceof WhatsAppNotConnectedError) throw error;
      console.error("Error sending image:", error);

      // Record failed message
      const failedRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "image",
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      };
      await supabase.from("whatsapp_messages").insert(failedRecord);
      throw error;
    }
  },

  // Get message history for a student
  async getMessageHistory(studentId?: string): Promise<WhatsAppMessage[]> {
    let query = supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching message history:", error);
      return [];
    }

    return data || [];
  },

  // Update message status (called by webhook)
  async updateMessageStatus(
    whatsappMessageId: string,
    status: MessageStatus,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("whatsapp_messages")
      .update({
        status,
        error_message: errorMessage,
        delivered_at: status === "delivered" ? new Date().toISOString() : undefined,
        read_at: status === "read" ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq("whatsapp_message_id", whatsappMessageId);

    if (error) {
      console.error("Error updating message status:", error);
    }
  },

  // Test WhatsApp connection
  async testConnection(testPhoneNumber: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.sendMessage({
      phoneNumber: testPhoneNumber,
      templateName: "general_announcement",
      variables: {
        announcement_text: "Bu bir test mesajıdır. WhatsApp entegrasyonunuz başarıyla yapılandırıldı!"
      },
      messageType: "custom"
    });
  }
};
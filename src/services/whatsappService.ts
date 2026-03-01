import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WhatsAppSettings = Database["public"]["Tables"]["whatsapp_settings"]["Row"];
type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
type WhatsAppMessageInsert = Database["public"]["Tables"]["whatsapp_messages"]["Insert"];
type WhatsAppTemplate = Database["public"]["Tables"]["whatsapp_templates"]["Row"];
type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

interface SendMessageParams {
  phoneNumber: string;
  templateName: string;
  variables: Record<string, string>;
  studentId?: string;
  messageType?: "payment_reminder" | "attendance" | "announcement" | "custom";
}

export const whatsappService = {
  // Get WhatsApp settings
  async getSettings(): Promise<WhatsAppSettings | null> {
    const { data, error } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error fetching WhatsApp settings:", error);
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
          error: "WhatsApp is not configured or inactive"
        };
      }

      // Prepare message record
      const messageRecord = {
        recipient_phone: params.phoneNumber,
        template_name: params.templateName,
        template_variables: params.variables,
        student_id: params.studentId,
        message_type: params.messageType || "custom",
        status: "pending" as MessageStatus
      };

      // Insert message record
      const { data: message, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert([messageRecord])
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
            messageId: message.id
          }
        }
      );

      if (functionError) {
        // Update message status to failed
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "failed" as MessageStatus,
            error_message: functionError.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", message.id);

        return {
          success: false,
          error: functionError.message
        };
      }

      // Update message status to sent
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "sent" as MessageStatus,
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
    dueDate: string
  ): Promise<{ success: boolean; error?: string }> {
    const formattedDate = new Date(dueDate).toLocaleDateString("tr-TR");
    const formattedAmount = amount.toLocaleString("tr-TR");

    return this.sendMessage({
      phoneNumber: parentPhone,
      templateName: "payment_reminder",
      variables: {
        student_name: studentName,
        amount: formattedAmount,
        due_date: formattedDate
      },
      studentId,
      messageType: "payment_reminder"
    });
  },

  // Send attendance notification
  async sendAttendanceNotification(
    studentId: string,
    parentPhone: string,
    studentName: string,
    attended: boolean,
    date: string
  ): Promise<{ success: boolean; error?: string }> {
    const formattedDate = new Date(date).toLocaleDateString("tr-TR");
    const status = attended ? "katıldı" : "katılmadı";

    return this.sendMessage({
      phoneNumber: parentPhone,
      templateName: "attendance_notification",
      variables: {
        student_name: studentName,
        attendance_status: status,
        attendance_date: formattedDate
      },
      studentId,
      messageType: "attendance"
    });
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
      if (!settings?.is_active) {
        throw new Error("WhatsApp integration is not active");
      }

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
      if (!settings?.is_active) {
        throw new Error("WhatsApp integration is not active");
      }

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
        message_type: "custom",
        status: "sent",
        whatsapp_message_id: functionData?.messageId,
      };

      const { data, error: insertError } = await supabase
        .from("whatsapp_messages")
        .insert(messageRecord)
        .select()
        .single();

      if (insertError) throw insertError;

      // Record in media table
      await supabase.from("whatsapp_media").insert({
        media_type: "document",
        media_url: documentUrl,
        caption: caption || filename,
      });

      return data;
    } catch (error) {
      // Record failed message
      const failedRecord: WhatsAppMessageInsert = {
        recipient_phone: phoneNumber,
        message_type: "custom",
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
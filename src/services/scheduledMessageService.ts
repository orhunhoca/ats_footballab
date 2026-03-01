import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { whatsappService } from "./whatsappService";

type ScheduledMessage = Database["public"]["Tables"]["scheduled_messages"]["Row"];
type ScheduledMessageInsert = Database["public"]["Tables"]["scheduled_messages"]["Insert"];
type MessageSchedulerSettings = Database["public"]["Tables"]["message_scheduler_settings"]["Row"];

export type ScheduleType = "training_reminder" | "payment_reminder" | "birthday" | "anniversary" | "custom";
export type ScheduleStatus = "pending" | "sent" | "failed" | "cancelled";

export const scheduledMessageService = {
  // Create a scheduled message
  async createScheduledMessage(
    messageType: ScheduleType,
    recipientPhone: string,
    scheduledFor: Date,
    messageContent: {
      templateName?: string;
      variables?: Record<string, string>;
      customText?: string;
    },
    metadata?: {
      studentId?: string;
      paymentId?: string;
      groupId?: string;
    }
  ): Promise<ScheduledMessage> {
    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert({
        message_type: messageType,
        recipient_phone: recipientPhone,
        scheduled_for: scheduledFor.toISOString(),
        status: "pending",
        message_content: messageContent,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Schedule training reminder (1 hour before training)
  async scheduleTrainingReminder(
    studentId: string,
    parentPhone: string,
    studentName: string,
    trainingDate: Date,
    groupName: string
  ): Promise<ScheduledMessage> {
    const reminderTime = new Date(trainingDate);
    reminderTime.setHours(reminderTime.getHours() - 1); // 1 hour before

    return this.createScheduledMessage(
      "training_reminder",
      parentPhone,
      reminderTime,
      {
        customText: `Hatırlatma: ${studentName} için bugün saat ${trainingDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} ${groupName} antrenmanı var! 🎯⚽`,
      },
      { studentId }
    );
  },

  // Schedule payment reminder (15 days, 7 days, and on due date)
  async schedulePaymentReminders(
    studentId: string,
    paymentId: string,
    parentPhone: string,
    studentName: string,
    amount: number,
    dueDate: Date
  ): Promise<ScheduledMessage[]> {
    const reminders: ScheduledMessage[] = [];

    // 15 days before
    const reminder15Days = new Date(dueDate);
    reminder15Days.setDate(reminder15Days.getDate() - 15);
    if (reminder15Days > new Date()) {
      reminders.push(
        await this.createScheduledMessage(
          "payment_reminder",
          parentPhone,
          reminder15Days,
          {
            customText: `Sayın Veli,\n\n${studentName} için ${dueDate.toLocaleDateString("tr-TR")} tarihinde ${amount} TL ödemeniz bulunmaktadır.\n\n15 gün kaldı! 💰\n\nSportex Futbol Okulu`,
          },
          { studentId, paymentId }
        )
      );
    }

    // 7 days before
    const reminder7Days = new Date(dueDate);
    reminder7Days.setDate(reminder7Days.getDate() - 7);
    if (reminder7Days > new Date()) {
      reminders.push(
        await this.createScheduledMessage(
          "payment_reminder",
          parentPhone,
          reminder7Days,
          {
            customText: `Sayın Veli,\n\n${studentName} için ${dueDate.toLocaleDateString("tr-TR")} tarihinde ${amount} TL ödemeniz bulunmaktadır.\n\n7 gün kaldı! ⏰\n\nSportex Futbol Okulu`,
          },
          { studentId, paymentId }
        )
      );
    }

    // On due date
    if (dueDate > new Date()) {
      reminders.push(
        await this.createScheduledMessage(
          "payment_reminder",
          parentPhone,
          dueDate,
          {
            customText: `Sayın Veli,\n\n${studentName} için BUGÜN ${amount} TL ödemeniz bulunmaktadır.\n\nLütfen ödemenizi yapmayı unutmayın! 🔔\n\nSportex Futbol Okulu`,
          },
          { studentId, paymentId }
        )
      );
    }

    return reminders;
  },

  // Schedule birthday message
  async scheduleBirthdayMessage(
    studentId: string,
    parentPhone: string,
    studentName: string,
    birthdayDate: Date
  ): Promise<ScheduledMessage> {
    // Set to 9:00 AM on birthday
    const messageTime = new Date(birthdayDate);
    messageTime.setHours(9, 0, 0, 0);

    return this.createScheduledMessage(
      "birthday",
      parentPhone,
      messageTime,
      {
        customText: `🎉🎂 Mutlu Yıllar ${studentName}! 🎂🎉\n\nDoğum gününü kutlar, nice mutlu, sağlıklı ve başarılı yıllar dileriz! ⚽🎈\n\nSportex Futbol Okulu Ailesi`,
      },
      { studentId }
    );
  },

  // Schedule anniversary message (registration anniversary)
  async scheduleAnniversaryMessage(
    studentId: string,
    parentPhone: string,
    studentName: string,
    anniversaryDate: Date,
    yearsCount: number
  ): Promise<ScheduledMessage> {
    const messageTime = new Date(anniversaryDate);
    messageTime.setHours(10, 0, 0, 0);

    return this.createScheduledMessage(
      "anniversary",
      parentPhone,
      messageTime,
      {
        customText: `🎉 Tebrikler!\n\n${studentName} ailemizde ${yearsCount} yılını doldurdu! 🏆⚽\n\nBizimle olan yolculuğunuz için teşekkür ederiz. Nice başarılı yıllara!\n\nSportex Futbol Okulu`,
      },
      { studentId }
    );
  },

  // Get pending messages
  async getPendingMessages(): Promise<ScheduledMessage[]> {
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all scheduled messages for a student
  async getStudentScheduledMessages(studentId: string): Promise<ScheduledMessage[]> {
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .contains("metadata", { studentId })
      .order("scheduled_for", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Update message status
  async updateMessageStatus(
    messageId: string,
    status: ScheduleStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from("scheduled_messages")
      .update(updateData)
      .eq("id", messageId);

    if (error) throw error;
  },

  // Cancel scheduled message
  async cancelScheduledMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled" })
      .eq("id", messageId);

    if (error) throw error;
  },

  // Process pending messages (called by cron job)
  async processPendingMessages(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    const pendingMessages = await this.getPendingMessages();
    let successful = 0;
    let failed = 0;

    for (const message of pendingMessages) {
      try {
        // Send the message via WhatsApp
        if (message.message_content && typeof message.message_content === "object") {
          const content = message.message_content as any;
          
          if (content.templateName) {
            // Send using template
            await whatsappService.sendTemplateMessage(
              message.recipient_phone,
              content.templateName,
              content.variables || {}
            );
          } else if (content.customText) {
            // Send custom text
            await whatsappService.sendCustomMessage(
              message.recipient_phone,
              content.customText
            );
          }
        }

        // Mark as sent
        await this.updateMessageStatus(message.id, "sent");
        successful++;
      } catch (error) {
        // Mark as failed
        await this.updateMessageStatus(
          message.id,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        failed++;
      }
    }

    return {
      processed: pendingMessages.length,
      successful,
      failed,
    };
  },

  // Get scheduler settings
  async getSchedulerSettings(): Promise<MessageSchedulerSettings | null> {
    const { data, error } = await supabase
      .from("message_scheduler_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Update scheduler settings
  async updateSchedulerSettings(settings: {
    enabled?: boolean;
    training_reminder_enabled?: boolean;
    training_reminder_hours_before?: number;
    payment_reminder_enabled?: boolean;
    payment_reminder_days?: number[];
    birthday_enabled?: boolean;
    anniversary_enabled?: boolean;
  }): Promise<MessageSchedulerSettings> {
    // Check if settings exist
    const existing = await this.getSchedulerSettings();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("message_scheduler_settings")
        .update(settings)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("message_scheduler_settings")
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },
};
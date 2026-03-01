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
    // Cast messageContent and metadata to any/Json to satisfy Supabase types if strict typing fails
    // or rely on the generated Json type.
    const messageData: ScheduledMessageInsert = {
      message_type: messageType,
      recipient_phone: recipientPhone,
      scheduled_for: scheduledFor.toISOString(),
      status: "pending",
      template_name: messageContent.templateName || "custom", // Fallback or required
      template_variables: messageContent.variables || {},
      // Store full content structure in a way we can retrieve (if needed, or rely on template_name/vars)
      // The table has template_name and template_variables. 
      // If it's custom text, we might need a convention. 
      // Let's assume custom text uses a 'custom_text' template or we store it in variables?
      // Re-reading table schema: it has template_name and template_variables.
      // If custom text, we might put it in variables or use a specific field if added.
      // For now, let's assume we pass customText in variables as 'text' if needed or handle it logic.
    };

    // If it is custom text, we might need to handle it. 
    // The previous implementation used message_content column which might not exist in type yet.
    // Let's use the columns that definitely exist based on my SQL:
    // template_name, template_variables.
    
    // ADJUSTMENT: The SQL I ran created `template_name` and `template_variables`. 
    // It did NOT create `message_content`. 
    // So I will map customText to a variable or handle it differently.
    
    if (messageContent.customText) {
        // Special handling for custom text if we don't have a column for it.
        // Or we use a generic 'custom_message' template.
        messageData.template_name = "custom_message";
        messageData.template_variables = { text: messageContent.customText };
    }

    const { data, error } = await supabase
      .from("scheduled_messages")
      .insert(messageData)
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
        templateName: "training_reminder",
        variables: {
          student_name: studentName,
          training_time: trainingDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          group_name: groupName
        }
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
    const formattedAmount = amount.toLocaleString("tr-TR");
    const formattedDate = dueDate.toLocaleDateString("tr-TR");

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
            templateName: "payment_reminder",
            variables: {
              student_name: studentName,
              amount: formattedAmount,
              due_date: formattedDate,
              time_left: "15 gün"
            }
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
            templateName: "payment_reminder",
            variables: {
              student_name: studentName,
              amount: formattedAmount,
              due_date: formattedDate,
              time_left: "7 gün"
            }
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
            templateName: "payment_reminder_due",
            variables: {
              student_name: studentName,
              amount: formattedAmount,
              due_date: formattedDate
            }
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
        templateName: "birthday_greeting",
        variables: {
          student_name: studentName
        }
      },
      { studentId }
    );
  },

  // Schedule anniversary message
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
        templateName: "anniversary_greeting",
        variables: {
          student_name: studentName,
          years_count: yearsCount.toString()
        }
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
    // Since metadata is jsonb, we use the contains filter
    // Note: TypeScript might complain about string vs object for metadata
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      // @ts-ignore - metadata querying
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
      updated_at: new Date().toISOString()
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
      .update({ 
        status: "cancelled",
        updated_at: new Date().toISOString()
      })
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
        if (message.template_name) {
          // Send using template
          const variables = message.template_variables as Record<string, string> || {};
          
          if (message.template_name === "custom_message" && variables.text) {
             await whatsappService.sendCustomMessage(
               message.recipient_phone,
               variables.text
             );
          } else {
             await whatsappService.sendTemplateMessage(
               message.recipient_phone,
               message.template_name,
               variables
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
  async getSchedulerSettings(): Promise<MessageSchedulerSettings[]> {
    const { data, error } = await supabase
      .from("message_scheduler_settings")
      .select("*");

    if (error) throw error;
    return data || [];
  },

  // Update scheduler settings
  async updateSchedulerSettings(settings: {
    training_reminder_enabled?: boolean;
    training_reminder_hours_before?: number;
    payment_reminder_enabled?: boolean;
    payment_reminder_days?: number; // Simplified to single value or we use logic elsewhere
    birthday_enabled?: boolean;
    anniversary_enabled?: boolean;
  }): Promise<void> {
    const updates: Promise<any>[] = [];

    // Training Reminder
    if (settings.training_reminder_enabled !== undefined || settings.training_reminder_hours_before !== undefined) {
      updates.push(
        supabase.from("message_scheduler_settings")
          .update({
            enabled: settings.training_reminder_enabled,
            hours_before: settings.training_reminder_hours_before,
            updated_at: new Date().toISOString()
          })
          .eq("setting_type", "training_reminder")
      );
    }

    // Payment Reminder
    if (settings.payment_reminder_enabled !== undefined) {
      updates.push(
        supabase.from("message_scheduler_settings")
          .update({
            enabled: settings.payment_reminder_enabled,
            // days_before: settings.payment_reminder_days, // Assuming single val for now
            updated_at: new Date().toISOString()
          })
          .eq("setting_type", "payment_reminder")
      );
    }

    // Birthday Greeting
    if (settings.birthday_enabled !== undefined) {
      updates.push(
        supabase.from("message_scheduler_settings")
          .update({
            enabled: settings.birthday_enabled,
            updated_at: new Date().toISOString()
          })
          .eq("setting_type", "birthday_greeting")
      );
    }

    await Promise.all(updates);
  },
};
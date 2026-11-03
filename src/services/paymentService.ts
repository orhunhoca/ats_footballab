import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { iyzicoService } from "./iyzicoService";
import { whatsappService } from "./whatsappService";

export type PaymentHistory = Database["public"]["Tables"]["payment_history"]["Row"];
export type PaymentMethod = "Nakit" | "Kredi Kartı" | "Havale/EFT" | "Online Ödeme" | "Diğer";
export type PaymentStatus = "paid" | "pending" | "overdue" | "cancelled";
export type PaymentType = "registration" | "summer_clothing" | "winter_clothing" | "other";

interface CreatePaymentData {
  studentId: string;
  amount: number;
  paymentMethod: string; // Changed to string to match DB enum or specific type
  paymentType: string;
  installmentNumber?: number;
  notes?: string;
  paymentDate?: string;
}

export const paymentService = {
  /**
   * Create a new payment record
   */
  async createPayment(data: CreatePaymentData) {
    const { data: payment, error } = await supabase
      .from("payment_history")
      .insert({
        student_id: data.studentId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_type: data.paymentType,
        installment_number: data.installmentNumber,
        notes: data.notes,
        payment_date: data.paymentDate || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating payment:", error);
      throw error;
    }

    // Update student payment status if this completes their payment
    await this.updateStudentPaymentStatus(data.studentId);

    return payment;
  },

  /**
   * Get all payments for a student
   */
  async getStudentPayments(studentId: string) {
    const { data, error } = await supabase
      .from("payment_history")
      .select("*")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching student payments:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all payments with student details
   */
  async getAllPayments(branchId?: string | null) {
    let query = supabase
      .from("payment_history")
      .select(`
        *,
        students (
          name
        )
      `)
      .order("payment_date", { ascending: false });
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching payments:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Update student payment status based on their payment history
   */
  async updateStudentPaymentStatus(studentId: string) {
    // Get student details
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("payment_amount, registration_end_date")
      .eq("id", studentId)
      .single();

    if (studentError) {
      console.error("Error fetching student:", studentError);
      return;
    }

    // Get total paid amount
    const { data: payments } = await supabase
      .from("payment_history")
      .select("amount")
      .eq("student_id", studentId);

    const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Determine payment status
    let status = "pending";
    const now = new Date();
    const endDate = student.registration_end_date ? new Date(student.registration_end_date) : null;

    if (totalPaid >= (student.payment_amount || 0)) {
      status = "paid";
    } else if (endDate && endDate < now) {
      status = "overdue";
    }

    // Update student payment status
    await supabase
      .from("students")
      .update({ payment_status: status })
      .eq("id", studentId);
  },

  /**
   * Get students with upcoming payment reminders (15 days before due date)
   */
  async getUpcomingPaymentReminders() {
    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 15);

    const { data: students, error } = await supabase
      .from("students")
      .select("*, father_phone, mother_phone")
      .eq("payment_status", "pending")
      .not("registration_end_date", "is", null)
      .lte("registration_end_date", reminderDate.toISOString())
      .gte("registration_end_date", now.toISOString());

    if (error) {
      console.error("Error fetching payment reminders:", error);
      throw error;
    }

    return students || [];
  },

  /**
   * Get payment statistics
   */
  async getPaymentStats(branchId?: string | null): Promise<{
    totalRevenue: number;
    pendingPayments: number;
    monthlyRevenue: number;
  }> {
    try {
      let allQuery = supabase.from("payment_history").select("amount");
      if (branchId) allQuery = allQuery.eq("branch_id", branchId);
      const { data: all } = await allQuery;

      const totalRevenue = all?.reduce((sum, p) => sum + p.amount, 0) || 0;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let monthlyQuery = supabase
        .from("payment_history")
        .select("amount")
        .gte("payment_date", monthStart.toISOString());
      if (branchId) monthlyQuery = monthlyQuery.eq("branch_id", branchId);
      const { data: monthly } = await monthlyQuery;

      const monthlyRevenue = monthly?.reduce((sum, p) => sum + p.amount, 0) || 0;

      return {
        totalRevenue,
        pendingPayments: 0,
        monthlyRevenue,
      };
    } catch (error) {
      console.error("Error getting payment stats:", error);
      return {
        totalRevenue: 0,
        pendingPayments: 0,
        monthlyRevenue: 0,
      };
    }
  },

  /**
   * Delete a payment record
   */
  async deletePayment(paymentId: string) {
    const { data: payment } = await supabase
      .from("payment_history")
      .select("student_id")
      .eq("id", paymentId)
      .single();

    const { error } = await supabase
      .from("payment_history")
      .delete()
      .eq("id", paymentId);

    if (error) {
      console.error("Error deleting payment:", error);
      throw error;
    }

    // Recalculate student payment status
    if (payment?.student_id) {
      await this.updateStudentPaymentStatus(payment.student_id);
    }
  },

  // Create online payment link
  async createOnlinePayment(params: {
    studentId: string;
    amount: number;
    paymentType: string;
    description?: string;
    sendViaWhatsApp?: boolean;
  }): Promise<{
    success: boolean;
    paymentLink?: string;
    error?: string;
    /** Link oluşturuldu ama WhatsApp mesajı gönderilemediyse nedeni */
    whatsappError?: string;
  }> {
    try {
      // Get student info
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("name, father_phone, mother_phone, father_name, mother_name")
        .eq("id", params.studentId)
        .single();

      if (studentError) throw studentError;

      // Create payment link via iyzico
      const result = await iyzicoService.createPaymentLink({
        studentId: params.studentId,
        studentName: student.name,
        amount: params.amount,
        paymentType: params.paymentType,
        description: params.description,
        parentPhone: student.father_phone || student.mother_phone || undefined
      });

      if (!result.success) {
        return result;
      }

      // Send via WhatsApp if requested
      if (params.sendViaWhatsApp && result.paymentLink) {
        const parentPhone = student.father_phone || student.mother_phone;
        
        if (parentPhone) {
          try {
            await whatsappService.sendCustomMessage(
              parentPhone,
            `🔐 FOOTBALLAB ONLINE ÖDEME\n\n` +
            `Öğrenci: ${student.name}\n` +
            `Tutar: ${params.amount.toLocaleString("tr-TR")} TL\n` +
            `Açıklama: ${params.description || params.paymentType}\n\n` +
            `Güvenli ödeme linki:\n${result.paymentLink}\n\n` +
            `⏰ Link 24 saat geçerlidir.\n` +
            `✅ Ödemeniz onaylandığında otomatik bildirim alacaksınız.`
            );
          } catch (error) {
            console.error("Payment link WhatsApp send failed:", error);
            return {
              ...result,
              whatsappError: error instanceof Error ? error.message : "WhatsApp gönderimi başarısız",
            };
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error creating online payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Online ödeme oluşturulamadı"
      };
    }
  },
};
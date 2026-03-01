import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { iyzicoService } from "./iyzicoService";
import { whatsappService } from "./whatsappService";

type PaymentHistory = Database["public"]["Tables"]["payment_history"]["Row"];
export type PaymentMethod = "cash" | "credit_card" | "bank_transfer" | "other";
export type PaymentStatus = "paid" | "pending" | "overdue" | "cancelled";
export type PaymentType = "registration" | "summer_clothing" | "winter_clothing" | "other";

interface CreatePaymentData {
  student_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_type: PaymentType;
  installment_number?: number;
  notes?: string;
}

interface PaymentStats {
  total_collected: number;
  pending_payments: number;
  overdue_payments: number;
  upcoming_payments: number;
}

/**
 * Create a new payment record
 */
export async function createPayment(data: CreatePaymentData) {
  const { data: payment, error } = await supabase
    .from("payment_history")
    .insert({
      ...data,
      payment_date: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating payment:", error);
    throw error;
  }

  // Update student payment status if this completes their payment
  await updateStudentPaymentStatus(data.student_id);

  return payment;
}

/**
 * Get all payments for a student
 */
export async function getStudentPayments(studentId: string) {
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
}

/**
 * Get all payments with student details
 */
export async function getAllPayments() {
  const { data, error } = await supabase
    .from("payment_history")
    .select(`
      *,
      students (
        first_name,
        last_name,
        payment_plan,
        payment_amount
      )
    `)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching payments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update student payment status based on their payment history
 */
async function updateStudentPaymentStatus(studentId: string) {
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
  let status: PaymentStatus = "pending";
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
}

/**
 * Get students with upcoming payment reminders (15 days before due date)
 */
export async function getUpcomingPaymentReminders() {
  const now = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 15);

  const { data: students, error } = await supabase
    .from("students")
    .select("*, parent:parent_id(*)")
    .eq("payment_status", "pending")
    .not("registration_end_date", "is", null)
    .lte("registration_end_date", reminderDate.toISOString())
    .gte("registration_end_date", now.toISOString());

  if (error) {
    console.error("Error fetching payment reminders:", error);
    throw error;
  }

  return students || [];
}

/**
 * Get payment statistics
 */
export async function getPaymentStats(): Promise<PaymentStats> {
  const { data: students } = await supabase
    .from("students")
    .select("payment_status, payment_amount");

  const stats: PaymentStats = {
    total_collected: 0,
    pending_payments: 0,
    overdue_payments: 0,
    upcoming_payments: 0
  };

  if (!students) return stats;

  students.forEach(student => {
    if (student.payment_status === "paid") {
      stats.total_collected += student.payment_amount || 0;
    } else if (student.payment_status === "pending") {
      stats.pending_payments += student.payment_amount || 0;
    } else if (student.payment_status === "overdue") {
      stats.overdue_payments += student.payment_amount || 0;
    }
  });

  return stats;
}

/**
 * Delete a payment record
 */
export async function deletePayment(paymentId: string) {
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
    await updateStudentPaymentStatus(payment.student_id);
  }
}

// Create online payment link
async function createOnlinePayment(params: {
  studentId: string;
  amount: number;
  paymentType: string;
  description?: string;
  sendViaWhatsApp?: boolean;
}): Promise<{
  success: boolean;
  paymentLink?: string;
  error?: string;
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
        await whatsappService.sendCustomMessage(
          parentPhone,
          `🔐 SPORTEX ONLINE ÖDEME\n\n` +
          `Öğrenci: ${student.name}\n` +
          `Tutar: ${params.amount.toLocaleString("tr-TR")} TL\n` +
          `Açıklama: ${params.description || params.paymentType}\n\n` +
          `Güvenli ödeme linki:\n${result.paymentLink}\n\n` +
          `⏰ Link 24 saat geçerlidir.\n` +
          `✅ Ödemeniz onaylandığında otomatik bildirim alacaksınız.`
        );
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
}
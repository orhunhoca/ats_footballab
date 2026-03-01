import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pdfService } from "./pdfService";
import { storageService } from "./storageService";
import { whatsappService } from "./whatsappService";

type DocumentTemplate = Database["public"]["Tables"]["document_templates"]["Row"];

export const documentService = {
  // Get all document templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("template_name");

    if (error) throw error;
    return data || [];
  },

  // Generate and send performance report
  async generateAndSendPerformanceReport(
    studentId: string,
    month: string,
    sendViaWhatsApp = true
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      // Fetch performance tests for the month
      const monthStart = new Date(month + "-01");
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const { data: tests, error: testsError } = await supabase
        .from("performance_tests")
        .select("*")
        .eq("student_id", studentId)
        .gte("test_date", monthStart.toISOString())
        .lt("test_date", monthEnd.toISOString())
        .order("test_date", { ascending: false });

      if (testsError) throw testsError;

      // Fetch attendance records for the month
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .gte("attendance_date", monthStart.toISOString())
        .lt("attendance_date", monthEnd.toISOString())
        .order("attendance_date", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Generate PDF
      const pdfBlob = await pdfService.generatePerformanceReport(
        student,
        tests || [],
        attendance || [],
        month
      );

      // Upload to Supabase Storage
      const fileName = `performance_${studentId}_${month}_${Date.now()}.pdf`;
      const uploadResult = await storageService.uploadFile(pdfBlob, fileName, "documents");

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Record in database
      const { error: recordError } = await supabase.from("whatsapp_media").insert({
        student_id: studentId,
        media_type: "document",
        media_url: uploadResult.url!,
        caption: `${student.full_name} - ${month} Performans Raporu`,
      });

      if (recordError) throw recordError;

      // Send via WhatsApp if requested
      if (sendViaWhatsApp && student.parent_phone) {
        await whatsappService.sendDocumentMessage(
          student.parent_phone,
          uploadResult.url!,
          `${student.full_name} - ${month} Performans Raporu.pdf`,
          `Merhaba, ${student.full_name} için ${month} dönemi performans raporunu gönderiyoruz.`
        );
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
      };
    } catch (error) {
      console.error("Error generating performance report:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Generate and send payment receipt
  async generateAndSendPaymentReceipt(
    paymentId: string,
    sendViaWhatsApp = true
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      // Fetch payment data
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("*, students(*)")
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      // Generate PDF
      const pdfBlob = await pdfService.generatePaymentReceipt(payment, payment.students);

      // Upload to Supabase Storage
      const fileName = `receipt_${paymentId}_${Date.now()}.pdf`;
      const uploadResult = await storageService.uploadFile(pdfBlob, fileName, "documents");

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Record in database
      const { error: recordError } = await supabase.from("whatsapp_media").insert({
        student_id: payment.student_id,
        media_type: "document",
        media_url: uploadResult.url!,
        caption: `Ödeme Makbuzu - ${new Date(payment.payment_date).toLocaleDateString("tr-TR")}`,
      });

      if (recordError) throw recordError;

      // Send via WhatsApp if requested
      if (sendViaWhatsApp && payment.students?.parent_phone) {
        await whatsappService.sendDocumentMessage(
          payment.students.parent_phone,
          uploadResult.url!,
          `Odeme_Makbuzu_${Date.now()}.pdf`,
          `Merhaba, ${new Date(payment.payment_date).toLocaleDateString("tr-TR")} tarihli ${payment.amount} TL tutarındaki ödeme makbuzunuzu gönderiyoruz.`
        );
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
      };
    } catch (error) {
      console.error("Error generating payment receipt:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Generate and send training schedule
  async generateAndSendTrainingSchedule(
    groupId: string,
    month: string,
    sendViaWhatsApp = true
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
    try {
      // Fetch group data
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;

      // Fetch training sessions for the group
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("*")
        .eq("group_id", groupId)
        .order("session_date", { ascending: true });

      if (sessionsError) throw sessionsError;

      // Create schedule data
      const schedule = (sessions || []).map((session) => ({
        day: new Date(session.session_date).toLocaleDateString("tr-TR", { weekday: "long" }),
        time: session.start_time || "-",
        location: session.location || "-",
      }));

      // Generate PDF
      const pdfBlob = await pdfService.generateTrainingSchedule(
        group.name,
        schedule,
        month
      );

      // Upload to Supabase Storage
      const fileName = `schedule_${groupId}_${month}_${Date.now()}.pdf`;
      const uploadResult = await storageService.uploadFile(pdfBlob, fileName, "documents");

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Send to all students in the group via WhatsApp
      if (sendViaWhatsApp) {
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("parent_phone, full_name")
          .eq("group_id", groupId);

        if (!studentsError && students) {
          for (const student of students) {
            if (student.parent_phone) {
              await whatsappService.sendDocumentMessage(
                student.parent_phone,
                uploadResult.url!,
                `Antrenman_Programi_${month}.pdf`,
                `Merhaba, ${group.name} grubu için ${month} dönemi antrenman programını gönderiyoruz.`
              );
            }
          }
        }
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
      };
    } catch (error) {
      console.error("Error generating training schedule:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
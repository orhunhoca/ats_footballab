import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { pdfService, type StudentData, type PaymentData } from "./pdfService";
import { storageService } from "./storageService";
import { whatsappService } from "./whatsappService";

type DocumentTemplate = Database["public"]["Tables"]["document_templates"]["Row"];

// WhatsApp gönderimi başarısız olsa bile PDF üretimi/kaydı başarılı sayılır; hata ayrıca döndürülür.
async function trySendDocument(
  phone: string,
  url: string,
  filename: string,
  caption: string
): Promise<string | undefined> {
  try {
    await whatsappService.sendDocumentMessage(phone, url, filename, caption);
    return undefined;
  } catch (error) {
    console.error("WhatsApp document send failed:", error);
    return error instanceof Error ? error.message : "WhatsApp gönderimi başarısız";
  }
}

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
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string; whatsappError?: string }> {
    try {
      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      // Map student data to interface
      const studentData: StudentData = {
        full_name: student.name, // mapped from name
        age: student.age,
        father_name: student.father_name,
        father_phone: student.father_phone,
        mother_name: student.mother_name,
        mother_phone: student.mother_phone
      };

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
        studentData,
        (tests || []).map(t => ({
            test_date: t.test_date,
            test_type: t.test_type,
            value: t.value,
            unit: t.unit,
            notes: t.notes
        })),
        (attendance || []).map(a => ({ status: a.status })),
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
        caption: `${studentData.full_name} - ${month} Performans Raporu`,
      });

      if (recordError) throw recordError;

      // Send via WhatsApp if requested
      const parentPhone = studentData.father_phone || studentData.mother_phone;
      let whatsappError: string | undefined;
      if (sendViaWhatsApp && parentPhone) {
        whatsappError = await trySendDocument(
          parentPhone,
          uploadResult.url!,
          `${studentData.full_name.replace(/\s+/g, '_')}_${month}_Raporu.pdf`,
          `Merhaba, ${studentData.full_name} için ${month} dönemi performans raporunu gönderiyoruz.`
        );
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
        whatsappError,
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
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string; whatsappError?: string }> {
    try {
      // Fetch payment data with student info
      // Using payment_history table
      const { data: payment, error: paymentError } = await supabase
        .from("payment_history")
        .select(`
          *,
          students (
            name,
            father_name,
            father_phone,
            mother_name,
            mother_phone
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;
      if (!payment.students) throw new Error("Student data not found for payment");

      // Transform data to match expected types
      const student = payment.students; // Single object because student_id is foreign key
      
      const studentData: StudentData = {
          full_name: student.name,
          father_name: student.father_name,
          father_phone: student.father_phone,
          mother_name: student.mother_name,
          mother_phone: student.mother_phone
      };
      
      const paymentData: PaymentData = {
          id: payment.id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_type: payment.payment_type,
          payment_method: payment.payment_method,
          notes: payment.notes
      };

      // Generate PDF
      const pdfBlob = await pdfService.generatePaymentReceipt(
        paymentData, 
        studentData
      );

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
      const parentPhone = studentData.father_phone || studentData.mother_phone;
      let whatsappError: string | undefined;
      if (sendViaWhatsApp && parentPhone) {
        whatsappError = await trySendDocument(
          parentPhone,
          uploadResult.url!,
          `Odeme_Makbuzu_${Date.now()}.pdf`,
          `Merhaba, ${new Date(payment.payment_date).toLocaleDateString("tr-TR")} tarihli ${payment.amount} TL tutarındaki ödeme makbuzunuzu gönderiyoruz.`
        );
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
        whatsappError,
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
  ): Promise<{ success: boolean; pdfUrl?: string; error?: string; whatsappError?: string }> {
    try {
      // Fetch group data
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;

      // Fetch training schedule for the group
      // Using group_schedule table (recurring weekly schedule)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("group_schedule")
        .select("*")
        .eq("group_id", groupId)
        .order("day_of_week", { ascending: true });

      if (scheduleError) throw scheduleError;

      // Map day numbers to day names
      const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
      
      // Create schedule data
      const schedule = (scheduleData || []).map((item) => ({
        day: dayNames[item.day_of_week] || "Bilinmiyor",
        time: `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}`,
        location: "Tesis" // Default location since not in schema
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
      let whatsappError: string | undefined;
      if (sendViaWhatsApp) {
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, name, father_phone, mother_phone") // Select needed fields
          .eq("status", "Aktif"); 
          // Note: Relationship for groups is via student_groups table, let's query via join
        
        // Correct way to get students in group via student_groups junction table
        const { data: groupStudents, error: groupStudentsError } = await supabase
            .from("student_groups")
            .select(`
                student_id,
                students (
                    name,
                    father_phone,
                    mother_phone
                )
            `)
            .eq("group_id", groupId);

        if (!groupStudentsError && groupStudents) {
          for (const item of groupStudents) {
            const student = item.students;
            if (!student) continue; // Skip if student data is missing
            
            // Check for student object properties (it might be an array or object depending on join)
            // Supabase returns single object for foreign key relation usually
            const s = Array.isArray(student) ? student[0] : student;
            
            const parentPhone = s.father_phone || s.mother_phone;
            
            if (parentPhone) {
              const err = await trySendDocument(
                parentPhone,
                uploadResult.url!,
                `Antrenman_Programi_${month}.pdf`,
                `Merhaba, ${group.name} grubu için ${month} dönemi antrenman programını gönderiyoruz.`
              );
              whatsappError = whatsappError ?? err;
            }
          }
        }
      }

      return {
        success: true,
        pdfUrl: uploadResult.url,
        whatsappError,
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
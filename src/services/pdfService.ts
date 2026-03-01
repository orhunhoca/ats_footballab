import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Database } from "@/integrations/supabase/types";

// Define strict types for inputs to avoid database type conflicts
interface StudentData {
  full_name: string;
  age?: number | null;
  parent_name?: string | null;
  parent_phone?: string | null;
}

interface TestData {
  test_date: string;
  test_type?: string | null;
  score?: number | string | null;
  notes?: string | null;
  value?: number | null; // Database uses value
}

interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  month?: string | null;
  payment_type?: string | null;
  status?: string | null;
  notes?: string | null;
}

interface AttendanceData {
  status: string;
}

export const pdfService = {
  // Generate Performance Report PDF
  async generatePerformanceReport(
    student: StudentData,
    tests: TestData[],
    attendanceRecords: AttendanceData[],
    month: string
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with logo
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("SPORTEX FUTBOL OKULU", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("AYLIK PERFORMANS RAPORU", pageWidth / 2, 30, { align: "center" });

    // Student Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ÖĞRENCİ BİLGİLERİ", 20, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Ad Soyad: ${student.full_name}`, 20, 65);
    doc.text(`Yaş: ${student.age?.toString() || "-"}`, 20, 72);
    doc.text(`Dönem: ${month}`, 20, 79);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, 20, 86);

    // Attendance Summary
    const totalDays = attendanceRecords.length;
    const attendedDays = attendanceRecords.filter((r) => r.status === "present").length;
    const attendanceRate = totalDays > 0 ? ((attendedDays / totalDays) * 100).toFixed(1) : "0";

    doc.setFont("helvetica", "bold");
    doc.text("YOKLAMA ÖZETİ", 20, 100);

    doc.setFont("helvetica", "normal");
    doc.text(`Toplam Antrenman: ${totalDays}`, 20, 110);
    doc.text(`Katıldı: ${attendedDays}`, 20, 117);
    doc.text(`Devamsızlık: ${totalDays - attendedDays}`, 20, 124);
    doc.text(`Devam Oranı: %${attendanceRate}`, 20, 131);

    // Performance Tests Table
    if (tests.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("PERFORMANS TESTLERİ", 20, 145);

      // Use value or score depending on what's available
      const testData = tests.map((test) => [
        new Date(test.test_date).toLocaleDateString("tr-TR"),
        test.test_type || "-",
        test.value?.toString() || test.score?.toString() || "-",
        test.notes || "-",
      ]);

      autoTable(doc, {
        startY: 150,
        head: [["Tarih", "Test Türü", "Skor", "Notlar"]],
        body: testData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 170;
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      "Bu rapor Sportex Futbol Okulu tarafından otomatik olarak oluşturulmuştur.",
      pageWidth / 2,
      finalY + 20,
      { align: "center" }
    );

    // Return PDF as Blob
    return doc.output("blob");
  },

  // Generate Payment Receipt PDF
  async generatePaymentReceipt(
    payment: PaymentData,
    student: StudentData
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("SPORTEX FUTBOL OKULU", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("ÖDEME MAKBUZU", pageWidth / 2, 30, { align: "center" });

    // Receipt Number
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const receiptNo = `FİŞ NO: ${payment.id.substring(0, 8).toUpperCase()}`;
    doc.text(receiptNo, pageWidth - 20, 50, { align: "right" });

    // Student Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ÖĞRENCİ BİLGİLERİ", 20, 65);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Ad Soyad: ${student.full_name}`, 20, 75);
    doc.text(`Veli: ${student.parent_name || "-"}`, 20, 82);
    doc.text(`Telefon: ${student.parent_phone || "-"}`, 20, 89);

    // Payment Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ÖDEME DETAYLARI", 20, 105);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Ödeme Tarihi: ${new Date(payment.payment_date).toLocaleDateString("tr-TR")}`, 20, 115);
    doc.text(`Dönem: ${payment.month || "-"}`, 20, 122);
    doc.text(`Ödeme Türü: ${payment.payment_type === "full" ? "Tam" : payment.payment_type === "installment" ? "Taksit" : "Diğer"}`, 20, 129);

    // Amount Box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 140, pageWidth - 40, 30, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const amountText = `${payment.amount.toLocaleString("tr-TR")} TL`;
    doc.text("ÖDENEN MİKTAR:", 30, 155);
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
    doc.text(amountText, pageWidth - 30, 157, { align: "right" });

    // Status
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const statusText = payment.status === "paid" ? "✓ ÖDENDİ" : payment.status === "pending" ? "BEKLİYOR" : "GECİKMİŞ";
    const statusColor = payment.status === "paid" ? [34, 197, 94] : payment.status === "pending" ? [251, 191, 36] : [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusText, 30, 165);

    // Notes
    if (payment.notes) {
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("NOTLAR:", 20, 185);
      doc.setFont("helvetica", "normal");
      doc.text(payment.notes, 20, 192);
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      "Bu makbuz elektronik ortamda oluşturulmuş olup geçerlidir.",
      pageWidth / 2,
      270,
      { align: "center" }
    );
    doc.text(
      `Oluşturma: ${new Date().toLocaleString("tr-TR")}`,
      pageWidth / 2,
      277,
      { align: "center" }
    );

    return doc.output("blob");
  },

  // Generate Training Schedule PDF
  async generateTrainingSchedule(
    groupName: string,
    schedule: Array<{ day: string; time: string; location: string }>,
    month: string
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(139, 92, 246); // Purple
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("SPORTEX FUTBOL OKULU", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("ANTRENMAN PROGRAMI", pageWidth / 2, 30, { align: "center" });

    // Group Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grup: ${groupName}`, 20, 55);
    doc.text(`Dönem: ${month}`, 20, 62);

    // Schedule Table
    const scheduleData = schedule.map((item) => [item.day, item.time, item.location]);

    autoTable(doc, {
      startY: 75,
      head: [["Gün", "Saat", "Saha/Salon"]],
      body: scheduleData,
      theme: "grid",
      headStyles: { fillColor: [139, 92, 246] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 11 },
    });

    // Important Notes
    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFont("helvetica", "bold");
    doc.text("ÖNEMLİ NOTLAR:", 20, finalY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const notes = [
      "• Antrenmanlara 10 dakika önce gelmeniz rica olunur.",
      "• Yanınızda su şişesi ve temiz spor kıyafeti bulundurunuz.",
      "• Devamsızlık durumunda lütfen önceden bildiriniz.",
    ];

    notes.forEach((note, index) => {
      doc.text(note, 20, finalY + 25 + index * 7);
    });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      "İyi antrenmanlar dileriz!",
      pageWidth / 2,
      270,
      { align: "center" }
    );

    return doc.output("blob");
  },
};
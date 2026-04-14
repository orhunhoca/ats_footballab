import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Define strict types for inputs based on actual DB schema
export interface StudentData {
  full_name: string; // mapped from name
  age?: number | null;
  father_name?: string | null;
  father_phone?: string | null;
  mother_name?: string | null;
  mother_phone?: string | null;
}

export interface TestData {
  test_date: string;
  test_type?: string | null;
  value?: number | string | null; // Database uses value
  unit?: string | null;
  notes?: string | null;
}

export interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_type?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  // payment_history doesn't have month or status columns directly, handled via logic
}

export interface AttendanceData {
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

      const testData = tests.map((test) => [
        new Date(test.test_date).toLocaleDateString("tr-TR"),
        test.test_type || "-",
        `${test.value || "-"} ${test.unit || ""}`,
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
    
    // Prefer father info, fallback to mother
    const parentName = student.father_name || student.mother_name || "-";
    const parentPhone = student.father_phone || student.mother_phone || "-";
    
    doc.text(`Veli: ${parentName}`, 20, 82);
    doc.text(`Telefon: ${parentPhone}`, 20, 89);

    // Payment Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ÖDEME DETAYLARI", 20, 105);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Ödeme Tarihi: ${new Date(payment.payment_date).toLocaleDateString("tr-TR")}`, 20, 115);
    
    const paymentTypeText = payment.payment_type === "registration" ? "Kayıt Ücreti" : 
                            payment.payment_type === "summer_clothing" ? "Yazlık Kıyafet" :
                            payment.payment_type === "winter_clothing" ? "Kışlık Kıyafet" : "Diğer";
                            
    doc.text(`Ödeme Türü: ${paymentTypeText}`, 20, 122);
    doc.text(`Ödeme Yöntemi: ${payment.payment_method || "-"}`, 20, 129);

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
    // Assuming payment_history only records successful payments
    doc.setTextColor(34, 197, 94);
    doc.text("✓ ÖDENDİ", 30, 165);

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
    schedule: Array<{ day: string; time: string; location?: string }>,
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
    const scheduleData = schedule.map((item) => [item.day, item.time, "Tesis"]);

    autoTable(doc, {
      startY: 75,
      head: [["Gün", "Saat", "Konum"]],
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

  // Generate Performance Analysis Report PDF (NEW)
  async generatePerformanceAnalysisReport(
    studentName: string,
    tests: Array<{
      test_date: string;
      test_type: string;
      value: number | string;
      unit?: string;
      notes?: string;
      improvement?: string;
    }>,
    stats: {
      totalTests: number;
      improvementRate: number;
      averageScore: number;
      lastTestDate: string | null;
    },
    aiAnalysis?: string
  ): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("SPORTEX FUTBOL OKULU", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.text("PERFORMANS ANALİZ RAPORU", pageWidth / 2, 30, { align: "center" });

    // Student Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ÖĞRENCİ BİLGİLERİ", 20, 55);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Öğrenci: ${studentName}`, 20, 65);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, 20, 72);
    doc.text(`Toplam Test Sayısı: ${stats.totalTests}`, 20, 79);
    doc.text(`Son Test Tarihi: ${stats.lastTestDate ? new Date(stats.lastTestDate).toLocaleDateString("tr-TR") : "Henüz test yapılmadı"}`, 20, 86);

    // Performance Stats Box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 95, pageWidth - 40, 25, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PERFORMANS İSTATİSTİKLERİ", 30, 105);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const improvementText = `Gelişim Oranı: ${stats.improvementRate > 0 ? '+' : ''}${stats.improvementRate.toFixed(1)}%`;
    const avgText = `Ortalama Skor: ${stats.averageScore.toFixed(1)}`;
    
    doc.text(improvementText, 30, 113);
    doc.text(avgText, 120, 113);

    // Set color based on improvement
    if (stats.improvementRate > 5) {
      doc.setTextColor(34, 197, 94); // Green
      doc.setFont("helvetica", "bold");
      doc.text("Gelişme Trendi", pageWidth - 30, 113, { align: "right" });
    } else if (stats.improvementRate < -5) {
      doc.setTextColor(239, 68, 68); // Red
      doc.setFont("helvetica", "bold");
      doc.text("Dikkat Gerekli", pageWidth - 30, 113, { align: "right" });
    } else {
      doc.setTextColor(107, 114, 128); // Gray
      doc.setFont("helvetica", "bold");
      doc.text("Stabil Performans", pageWidth - 30, 113, { align: "right" });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Test Results Table
    let startY = 130;
    
    if (tests.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TEST SONUÇLARI", 20, startY);

      const testData = tests.slice(0, 15).map((test) => [
        new Date(test.test_date).toLocaleDateString("tr-TR"),
        test.test_type || "Belirtilmemiş",
        `${test.value} ${test.unit || ""}`.trim(),
        test.improvement || "Veri yok",
        test.notes || "Not yok",
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [["Tarih", "Test Türü", "Sonuç", "Değişim", "Notlar"]],
        body: testData,
        theme: "grid",
        headStyles: { 
          fillColor: [59, 130, 246],
          fontSize: 10,
          fontStyle: "bold"
        },
        margin: { left: 20, right: 20 },
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 25 },  // Tarih
          1: { cellWidth: 35 },  // Test Türü
          2: { cellWidth: 30 },  // Sonuç
          3: { cellWidth: 25 },  // Değişim
          4: { cellWidth: 'auto' }  // Notlar
        }
      });

      startY = (doc as any).lastAutoTable?.finalY + 15 || 200;
    }

    // AI Analysis Section
    if (aiAnalysis) {
      // Check if we need a new page
      if (startY > 220) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("YAPAY ZEKA DESTEKLİ PERFORMANS ANALİZİ", 20, startY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Split AI analysis into lines
      const analysisLines = doc.splitTextToSize(aiAnalysis, pageWidth - 40);
      doc.text(analysisLines, 20, startY + 8);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.text(
      `Bu rapor Sportex Futbol Okulu tarafından ${new Date().toLocaleDateString("tr-TR")} tarihinde otomatik olarak oluşturulmuştur.`,
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
    doc.setFontSize(7);
    doc.text(
      "Sorularınız için: info@sportex.com",
      pageWidth / 2,
      footerY + 4,
      { align: "center" }
    );

    return doc.output("blob");
  },
};
import * as XLSX from "xlsx";

export interface AttendanceRecord {
  date: string;
  studentName: string;
  groupName: string;
  status: string;
}

export interface AttendanceStats {
  studentName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: string;
}

export const excelService = {
  // Generate Attendance List Excel
  async generateAttendanceListExcel(
    records: AttendanceRecord[],
    groupName: string,
    dateRange?: string
  ): Promise<Blob> {
    // Prepare data for Excel
    const excelData = records.map((record) => ({
      "Tarih": record.date,
      "Öğrenci Adı": record.studentName,
      "Grup": record.groupName,
      "Durum": record.status === "present" ? "Geldi" : "Gelmedi",
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 12 }, // Tarih
      { wch: 25 }, // Öğrenci Adı
      { wch: 20 }, // Grup
      { wch: 10 }, // Durum
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Yoklama Listesi");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    return new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  },

  // Generate Attendance Report Excel (with statistics)
  async generateAttendanceReportExcel(
    stats: AttendanceStats[],
    dateRange: string
  ): Promise<Blob> {
    // Prepare statistics data
    const statsData = stats.map((stat) => ({
      "Öğrenci Adı": stat.studentName,
      "Toplam Gün": stat.totalDays,
      "Geldiği Gün": stat.presentDays,
      "Gelmediği Gün": stat.absentDays,
      "Devam Oranı": stat.attendanceRate,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(statsData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 25 }, // Öğrenci Adı
      { wch: 12 }, // Toplam Gün
      { wch: 12 }, // Geldiği Gün
      { wch: 15 }, // Gelmediği Gün
      { wch: 12 }, // Devam Oranı
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Yoklama Raporu");

    // Add summary sheet
    const summaryData = [
      { "Bilgi": "Rapor Dönemi", "Değer": dateRange },
      { "Bilgi": "Toplam Öğrenci", "Değer": stats.length },
      { "Bilgi": "Rapor Tarihi", "Değer": new Date().toLocaleDateString("tr-TR") },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Özet");

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    return new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  },

  // Download blob as file
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
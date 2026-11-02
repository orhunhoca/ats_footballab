/**
 * WhatsApp şablon gövdeleri. Meta Business Manager'da AYNI metinle oluşturulmalıdır
 * (veritabanındaki whatsapp_templates.message_content ile de aynıdır).
 * Önizleme ve mesaj kaydı bu metinden üretilir.
 */
export function buildPerformanceReportText(p: {
  parentName: string;
  studentName: string;
  testDate: string;
  results: string;
  evaluation: string;
}): string {
  return [
    `Merhaba ${p.parentName} 👋`,
    "",
    `${p.studentName} için ${p.testDate} tarihli performans test sonuçları hazır:`,
    "",
    `📊 ${p.results}`,
    "",
    `💬 Antrenör değerlendirmesi: ${p.evaluation}`,
    "",
    "Gelişimi birlikte takip etmeye devam ediyoruz.",
    "FootbalLab Futbol Okulu",
  ].join("\n");
}

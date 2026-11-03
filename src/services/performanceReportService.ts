import { supabase } from "@/integrations/supabase/client";
import { companyService } from "@/services/companyService";
import {
  analyzeStudentTests,
  buildParentSummary,
  buildRuleBasedAnalysis,
} from "@/lib/performanceAnalysis";
import { buildPerformanceReportPdf } from "@/lib/performanceReportPdf";
import type { PerformanceTest } from "@/services/performanceService";
import type { Student } from "@/services/studentService";

export interface BuildReportOptions {
  student: Student;
  tests: PerformanceTest[];
  /** Yapay zekâ/kural tabanlı Markdown analiz; yoksa kayıtlı verilerden kural tabanlı üretilir */
  analysisMarkdown?: string;
  parentSummary?: string;
  aiGenerated?: boolean;
  branchName?: string | null;
}

export interface BuiltReport {
  blob: Blob;
  filename: string;
}

const SIGNED_URL_SECONDS = 24 * 60 * 60;

function safeName(name: string): string {
  return name
    .replace(/[ğĞ]/g, (c) => (c === "ğ" ? "g" : "G"))
    .replace(/[üÜ]/g, (c) => (c === "ü" ? "u" : "U"))
    .replace(/[şŞ]/g, (c) => (c === "ş" ? "s" : "S"))
    .replace(/[ıİ]/g, (c) => (c === "ı" ? "i" : "I"))
    .replace(/[öÖ]/g, (c) => (c === "ö" ? "o" : "O"))
    .replace(/[çÇ]/g, (c) => (c === "ç" ? "c" : "C"))
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const performanceReportService = {
  async build(opts: BuildReportOptions): Promise<BuiltReport> {
    const { student, tests } = opts;
    const stats = analyzeStudentTests(tests);
    const school = await companyService.getPublicInfo();
    const groups = ((student as unknown as { student_groups?: { groups?: { name?: string } | null }[] }).student_groups ?? [])
      .map((sg) => sg.groups?.name)
      .filter(Boolean)
      .join(", ");

    const blob = await buildPerformanceReportPdf({
      student: { name: student.name, age: student.age, groupName: groups || null, branchName: opts.branchName ?? null },
      stats,
      analysisMarkdown: opts.analysisMarkdown || buildRuleBasedAnalysis(student.name, student.age, stats),
      parentSummary: opts.parentSummary || buildParentSummary(stats),
      aiGenerated: !!opts.aiGenerated,
      school: {
        name: school.legal_name || "FootbalLab Futbol Okulu",
        phone: school.phone,
        email: school.email,
        address: school.address,
      },
    });
    const date = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
    return { blob, filename: `${safeName(student.name) || "Ogrenci"}_Performans_Raporu_${date}.pdf` };
  },

  /** PDF'i özel 'reports' deposuna yükler ve 24 saatlik imzalı bağlantı döndürür (yalnız yönetim) */
  async uploadAndSign(studentId: string, report: BuiltReport): Promise<string> {
    const path = `${studentId}/${Date.now()}-${report.filename}`;
    const { error } = await supabase.storage
      .from("reports")
      .upload(path, report.blob, { contentType: "application/pdf", upsert: false });
    if (error) throw new Error(`PDF yüklenemedi: ${error.message}`);
    const { data, error: signError } = await supabase.storage.from("reports").createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signError || !data?.signedUrl) throw new Error("PDF bağlantısı oluşturulamadı");
    return data.signedUrl;
  },

  download(report: BuiltReport) {
    const url = window.URL.createObjectURL(report.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

import type { StudentAnalysis, MetricSummary } from "@/lib/performanceAnalysis";
import { formatNumber, formatUnit } from "@/lib/performanceAnalysis";

/**
 * Veliye verilecek performans gelişim raporu (PDF). Türkçe karakterler için Liberation Sans (public/fonts)
 * gömülür; logo public/logo.png'den alınır. Tarayıcıda dinamik içe aktarılır (sayfa yüküne eklenmez).
 */
export interface PdfReportInput {
  student: { name: string; age?: number | null; groupName?: string | null; branchName?: string | null };
  stats: StudentAnalysis;
  /** Markdown biçimli ayrıntılı değerlendirme (yapay zekâ ya da kural tabanlı) */
  analysisMarkdown: string;
  /** Veliye yönelik kısa özet (boş olabilir) */
  parentSummary: string;
  aiGenerated: boolean;
  school: { name: string; phone?: string | null; address?: string | null; email?: string | null };
  reportDate?: Date;
}

/** Testlerde yazı tipi/logo dosyalarını dışarıdan vermek için (tarayıcıda boş bırakılır: fetch ile yüklenir) */
export interface PdfAssets {
  regular: Uint8Array;
  bold: Uint8Array;
  logoDataUrl?: string | null;
}

const BRAND = { r: 5, g: 150, b: 105 };
const INK = { r: 31, g: 41, b: 55 };
const MUTED = { r: 107, g: 114, b: 128 };
const SOFT = { r: 243, g: 244, b: 246 };
const GOOD = { r: 22, g: 163, b: 74 };
const BAD = { r: 220, g: 38, b: 38 };
const WARN = { r: 217, g: 119, b: 6 };

const FONT = "LiberationSans";
const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;
const FOOTER_H = 20;

const TREND_LABEL: Record<string, string> = {
  improving: "Gelişiyor",
  declining: "Dikkat",
  stable: "İstikrarlı",
  single: "İlk ölçüm",
};

/** Yazı tipinde olmayabilecek emoji/simge karakterlerini temizler */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[☀-➿️‍]/g, "")
    .replace(/ /g, " ");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dosya yüklenemedi: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function fetchLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type RGB = { r: number; g: number; b: number };

interface Word {
  text: string;
  bold: boolean;
}

/** "**kalın**" işaretli metni kelimelere böler */
function toWords(text: string, forceBold = false): Word[] {
  const words: Word[] = [];
  text.split("**").forEach((part, i) => {
    const bold = forceBold || i % 2 === 1;
    part.split(/\s+/).filter(Boolean).forEach((w) => words.push({ text: w, bold }));
  });
  return words;
}

export async function buildPerformanceReportPdf(input: PdfReportInput, assets?: PdfAssets): Promise<Blob> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const regular = assets?.regular ?? (await fetchBytes("/fonts/LiberationSans-Regular.ttf"));
  const bold = assets?.bold ?? (await fetchBytes("/fonts/LiberationSans-Bold.ttf"));
  const logo = assets ? assets.logoDataUrl ?? null : await fetchLogo();

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("LiberationSans-Regular.ttf", toBase64(regular));
  doc.addFileToVFS("LiberationSans-Bold.ttf", toBase64(bold));
  doc.addFont("LiberationSans-Regular.ttf", FONT, "normal");
  doc.addFont("LiberationSans-Bold.ttf", FONT, "bold");
  doc.setProperties({ title: `${input.student.name} - Performans Raporu`, author: input.school.name, creator: "FootbalLab" });

  const date = input.reportDate ?? new Date();
  const dateText = date.toLocaleDateString("tr-TR");
  const { stats } = input;
  let y = 0;

  const color = (c: RGB) => doc.setTextColor(c.r, c.g, c.b);
  const fill = (c: RGB) => doc.setFillColor(c.r, c.g, c.b);
  const font = (weight: "normal" | "bold", size: number) => {
    doc.setFont(FONT, weight);
    doc.setFontSize(size);
  };
  const ensure = (h: number) => {
    if (y + h > PAGE_H - FOOTER_H - 4) {
      doc.addPage();
      y = M;
    }
  };

  /** Kalın/normal karışık metni verilen genişlikte satırlara bölerek yazar; bitiş y'sini döndürür */
  const paragraph = (text: string, x: number, maxW: number, size: number, c: RGB, lineH: number, forceBold = false) => {
    font("normal", size);
    color(c);
    const words = toWords(sanitizePdfText(text), forceBold);
    let line: Word[] = [];
    let lineW = 0;
    const spaceW = () => {
      font("normal", size);
      return doc.getTextWidth(" ");
    };
    const widthOf = (w: Word) => {
      font(w.bold ? "bold" : "normal", size);
      return doc.getTextWidth(w.text);
    };
    const flush = () => {
      if (!line.length) return;
      ensure(lineH);
      let cx = x;
      line.forEach((w, i) => {
        font(w.bold ? "bold" : "normal", size);
        color(c);
        doc.text(w.text, cx, y);
        cx += widthOf(w) + (i < line.length - 1 ? spaceW() : 0);
      });
      y += lineH;
      line = [];
      lineW = 0;
    };
    for (const w of words) {
      const ww = widthOf(w);
      const extra = line.length ? spaceW() : 0;
      if (lineW + extra + ww > maxW && line.length) flush();
      lineW += (line.length ? spaceW() : 0) + ww;
      line.push(w);
    }
    flush();
  };

  // ------------------------------------------------------------ Başlık bandı
  fill(BRAND);
  doc.rect(0, 0, PAGE_W, 36, "F");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M, 7, 22, 22);
    } catch {
      /* logo eklenemezse yazıyla devam */
    }
  }
  const titleX = logo ? M + 28 : M;
  font("bold", 20);
  doc.setTextColor(255, 255, 255);
  doc.text("Performans Gelişim Raporu", titleX, 17);
  font("normal", 10.5);
  doc.text(sanitizePdfText(input.school.name), titleX, 25);
  font("normal", 9.5);
  doc.text(dateText, PAGE_W - M, 17, { align: "right" });
  if (input.aiGenerated) doc.text("Yapay zekâ destekli analiz", PAGE_W - M, 25, { align: "right" });

  // ------------------------------------------------------------ Öğrenci kartı
  y = 44;
  fill(SOFT);
  doc.roundedRect(M, y, PAGE_W - 2 * M, 28, 3, 3, "F");
  font("normal", 8.5);
  color(MUTED);
  doc.text("ÖĞRENCİ", M + 6, y + 7);
  font("bold", 17);
  color(INK);
  doc.text(sanitizePdfText(input.student.name), M + 6, y + 16);
  font("normal", 10);
  color(MUTED);
  const meta = [
    input.student.age ? `${input.student.age} yaş` : null,
    input.student.groupName ? `Grup: ${input.student.groupName}` : null,
    input.student.branchName ? input.student.branchName : null,
  ].filter(Boolean);
  doc.text(sanitizePdfText(meta.join("  ·  ") || "-"), M + 6, y + 23);

  const period =
    stats.firstDate && stats.latestDate
      ? `${new Date(stats.firstDate).toLocaleDateString("tr-TR")} – ${new Date(stats.latestDate).toLocaleDateString("tr-TR")}`
      : "-";
  font("normal", 8.5);
  doc.text("TEST DÖNEMİ", PAGE_W - M - 6, y + 7, { align: "right" });
  font("bold", 11);
  color(INK);
  doc.text(period, PAGE_W - M - 6, y + 14, { align: "right" });
  font("normal", 9.5);
  color(MUTED);
  doc.text(`${stats.totalTests} ölçüm · ${stats.metrics.length} farklı test`, PAGE_W - M - 6, y + 21, { align: "right" });
  y += 28 + 7;

  // ------------------------------------------------------------ Veli özeti
  const summary = sanitizePdfText(input.parentSummary || "").trim();
  if (summary) {
    font("normal", 10.5);
    const lines = doc.splitTextToSize(summary, PAGE_W - 2 * M - 14) as string[];
    const boxH = 11 + lines.length * 5.2;
    ensure(boxH + 4);
    fill({ r: 236, g: 253, b: 245 });
    doc.roundedRect(M, y, PAGE_W - 2 * M, boxH, 2.5, 2.5, "F");
    fill(BRAND);
    doc.rect(M, y, 2.2, boxH, "F");
    font("bold", 9);
    color(BRAND);
    doc.text("ANTRENÖRÜN KISA DEĞERLENDİRMESİ", M + 8, y + 6.5);
    font("normal", 10.5);
    color(INK);
    doc.text(lines, M + 8, y + 12.5);
    y += boxH + 7;
  }

  // ------------------------------------------------------------ Özet kutucukları
  const tiles = [
    { label: "Gelişen test", value: stats.improving.length, c: GOOD },
    { label: "İstikrarlı", value: stats.stable.length, c: MUTED },
    { label: "Dikkat gereken", value: stats.declining.length, c: stats.declining.length ? WARN : MUTED },
    { label: "İlk ölçüm", value: stats.singles.length, c: BRAND },
  ];
  ensure(24);
  const tileW = (PAGE_W - 2 * M - 3 * 4) / 4;
  tiles.forEach((t, i) => {
    const tx = M + i * (tileW + 4);
    fill({ r: 255, g: 255, b: 255 });
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(tx, y, tileW, 20, 2.5, 2.5, "FD");
    font("bold", 18);
    color(t.c);
    doc.text(String(t.value), tx + tileW / 2, y + 10.5, { align: "center" });
    font("normal", 8.5);
    color(MUTED);
    doc.text(t.label, tx + tileW / 2, y + 16.5, { align: "center" });
  });
  y += 20 + 8;

  // ------------------------------------------------------------ Sonuç tablosu
  const sectionTitle = (title: string) => {
    ensure(14);
    font("bold", 12.5);
    color(BRAND);
    doc.text(title, M, y);
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.5);
    doc.line(M, y + 1.8, PAGE_W - M, y + 1.8);
    y += 7;
  };

  if (stats.metrics.length > 0) {
    sectionTitle("Test sonuçları");
    const rows = stats.metrics.map((m: MetricSummary) => {
      const unit = formatUnit(m.unit);
      const change = m.changePct === null ? "-" : `${m.changePct > 0 ? "+" : m.changePct < 0 ? "−" : ""}%${formatNumber(Math.abs(m.changePct))}`;
      return [
        sanitizePdfText(m.name),
        sanitizePdfText(m.category),
        `${formatNumber(m.first)} ${unit}`.trim(),
        `${formatNumber(m.latest)} ${unit}`.trim(),
        `${formatNumber(m.best)} ${unit}`.trim(),
        change,
        TREND_LABEL[m.trend] ?? "",
      ];
    });
    autoTable(doc, {
      startY: y,
      head: [["Test", "Kategori", "İlk", "Son", "En iyi", "Değişim", "Durum"]],
      body: rows,
      margin: { left: M, right: M, bottom: FOOTER_H + 6 },
      theme: "grid",
      styles: { font: FONT, fontSize: 9, cellPadding: 2.2, textColor: [INK.r, INK.g, INK.b], lineColor: [229, 231, 235], lineWidth: 0.2 },
      headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { fontStyle: "bold" }, 5: { halign: "right" }, 6: { halign: "center", fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const m = stats.metrics[data.row.index];
        if (!m) return;
        if (data.column.index === 5 || data.column.index === 6) {
          const c = m.trend === "improving" ? GOOD : m.trend === "declining" ? BAD : MUTED;
          data.cell.styles.textColor = [c.r, c.g, c.b];
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

    // ---------------------------------------------------------- Değişim çubukları
    const withChange = stats.metrics.filter((m) => m.changePct !== null);
    if (withChange.length > 0) {
      sectionTitle("Gelişim grafiği (ilk ölçüme göre değişim)");
      const labelW = 52;
      const chartX = M + labelW;
      const chartW = PAGE_W - M - chartX - 18;
      const maxAbs = Math.max(10, ...withChange.map((m) => Math.abs(m.changePct ?? 0)));
      const zeroX = chartX + chartW / 2;
      withChange.forEach((m) => {
        ensure(9);
        const v = m.changePct ?? 0;
        font("normal", 9);
        color(INK);
        doc.text(sanitizePdfText(m.name).slice(0, 28), M, y + 3.2);
        fill({ r: 243, g: 244, b: 246 });
        doc.rect(chartX, y, chartW, 4.6, "F");
        const len = (Math.abs(v) / maxAbs) * (chartW / 2);
        const c = v >= 0 ? GOOD : BAD;
        fill(c);
        if (v >= 0) doc.rect(zeroX, y, Math.max(len, 0.4), 4.6, "F");
        else doc.rect(zeroX - len, y, Math.max(len, 0.4), 4.6, "F");
        doc.setDrawColor(156, 163, 175);
        doc.setLineWidth(0.3);
        doc.line(zeroX, y - 0.8, zeroX, y + 5.4);
        font("bold", 8.5);
        color(c);
        doc.text(`${v > 0 ? "+" : v < 0 ? "−" : ""}%${formatNumber(Math.abs(v))}`, PAGE_W - M, y + 3.5, { align: "right" });
        y += 8.2;
      });
      font("normal", 8);
      color(MUTED);
      doc.text("Süre testlerinde düşük değer daha iyidir; grafik gelişimi her zaman sağa (yeşil) gösterir.", M, y + 2);
      y += 9;
    }
  }

  // ------------------------------------------------------------ Ayrıntılı değerlendirme
  const md = sanitizePdfText(input.analysisMarkdown || "").replace(/\r/g, "");
  if (md.trim()) {
    ensure(24);
    sectionTitle("Ayrıntılı değerlendirme");
    for (const raw of md.split("\n")) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        y += 1.6;
        continue;
      }
      if (/^#\s/.test(line)) continue; // belge başlığı zaten sayfada var
      const h = line.match(/^#{2,4}\s+(.*)$/);
      if (h) {
        ensure(12);
        y += 2.5;
        font("bold", 11);
        color(INK);
        doc.text(h[1].replace(/\*\*/g, ""), M, y);
        y += 5.5;
        continue;
      }
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      if (bullet) {
        ensure(6);
        fill(BRAND);
        doc.circle(M + 2.2, y - 1.3, 0.8, "F");
        paragraph(bullet[1], M + 6, PAGE_W - 2 * M - 6, 10, INK, 5);
        y += 0.8;
        continue;
      }
      const note = line.match(/^_(.*)_$/);
      if (note) {
        y += 1;
        paragraph(note[1], M, PAGE_W - 2 * M, 8.5, MUTED, 4.2);
        continue;
      }
      paragraph(line, M, PAGE_W - 2 * M, 10, INK, 5);
      y += 0.8;
    }
  }

  // ------------------------------------------------------------ Alt bilgi (her sayfa)
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const fy = PAGE_H - FOOTER_H + 6;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(M, fy - 3, PAGE_W - M, fy - 3);
    font("bold", 8.5);
    color(INK);
    doc.text(sanitizePdfText(input.school.name), M, fy + 1);
    font("normal", 8);
    color(MUTED);
    const contact = [input.school.phone, input.school.email].filter(Boolean).join("  ·  ");
    if (contact) doc.text(sanitizePdfText(contact), M, fy + 5.5);
    doc.text(`Sayfa ${p} / ${pages}`, PAGE_W - M, fy + 1, { align: "right" });
    font("normal", 7);
    doc.text("Bu rapor okulda kaydedilen ölçümlere dayanır; yaş grubu normu içermez ve tıbbi değerlendirme yerine geçmez.  © ATS - All Time Sports", M, fy + 10);
  }

  return doc.output("blob");
}

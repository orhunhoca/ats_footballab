/**
 * Şablon değişkenleri: veritabanında `variables` dizisi (ör. ["parent_name","student_name"]) ve gövdede {{1}}, {{2}}.
 * Düzenleyicide kolay okunur adlarla ({veli_adi}) yazılır; kaydederken {{n}} biçimine çevrilir.
 */
export interface TemplateVar {
  key: string;
  token: string;
  label: string;
  example: string;
}

export const TEMPLATE_VARS: TemplateVar[] = [
  { key: "parent_name", token: "veli_adi", label: "Veli adı", example: "Ayşe Hanım" },
  { key: "student_name", token: "ogrenci_adi", label: "Öğrenci adı", example: "Ali Yılmaz" },
  { key: "amount", token: "tutar", label: "Tutar (TL)", example: "1.500" },
  { key: "payment_date", token: "vade_tarihi", label: "Vade tarihi", example: "15.11.2026" },
  { key: "clothing_info", token: "kiyafet_bilgisi", label: "Kıyafet (yazlık/kışlık)", example: "Kışlık kıyafet" },
  { key: "trial_date", token: "deneme_tarihi", label: "Deneme tarihi", example: "12.11.2026" },
  { key: "group_info", token: "grup_bilgisi", label: "Grup · gün saat · saha", example: "U12 Mavi · Çarşamba 18:00-19:00 · Saha 2" },
];

const byKey = new Map(TEMPLATE_VARS.map((v) => [v.key, v]));
const byToken = new Map(TEMPLATE_VARS.map((v) => [v.token, v]));

/** Veritabanı gövdesi ({{1}}…) → düzenleyici metni ({veli_adi}…) */
export function toEditorText(body: string, variables: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (m, n) => {
    const key = variables[Number(n) - 1];
    const v = key ? byKey.get(key) : undefined;
    return v ? `{${v.token}}` : m;
  });
}

/** Düzenleyici metni → { body: {{n}}'li gövde, variables: ilk görünüş sırasına göre anahtarlar } */
export function fromEditorText(text: string): { body: string; variables: string[]; unknown: string[] } {
  const variables: string[] = [];
  const unknown: string[] = [];
  const body = text.replace(/\{([a-z_]+)\}/g, (m, token) => {
    const v = byToken.get(token);
    if (!v) {
      if (!unknown.includes(m)) unknown.push(m);
      return m;
    }
    let idx = variables.indexOf(v.key);
    if (idx === -1) {
      variables.push(v.key);
      idx = variables.length - 1;
    }
    return `{{${idx + 1}}}`;
  });
  return { body, variables, unknown };
}

/** Önizleme: örnek değerlerle doldurur */
export function previewText(text: string): string {
  return text.replace(/\{([a-z_]+)\}/g, (m, token) => byToken.get(token)?.example ?? m);
}

/** Meta kuralı: gövde değişkenle başlayıp bitemez */
export function metaBodyProblem(body: string): string | null {
  const t = body.trim();
  if (!t) return "Mesaj metni boş olamaz.";
  if (/^\{\{\d+\}\}/.test(t) || /\{\{\d+\}\}$/.test(t)) return "Meta kuralı: mesaj bir değişkenle başlayıp bitemez; başına ve sonuna sabit metin ekleyin.";
  return null;
}

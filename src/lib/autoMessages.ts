export type AutoMessageType = "training_reminder" | "payment_reminder" | "birthday_greeting" | "anniversary_greeting";

export interface AutoMessageVariable {
  key: string;
  label: string;
  sample: string;
}

const PARENT: AutoMessageVariable = { key: "veli_adi", label: "Veli adı", sample: "Ayşe Hanım" };
const STUDENT: AutoMessageVariable = { key: "ogrenci_adi", label: "Öğrenci adı", sample: "Ali Yılmaz" };

export const AUTO_MESSAGES: Record<AutoMessageType, { title: string; variables: AutoMessageVariable[]; defaultText: string }> = {
  training_reminder: {
    title: "Antrenman Hatırlatıcısı",
    variables: [PARENT, STUDENT, { key: "saat", label: "Antrenman saati", sample: "17:00" }],
    defaultText: "Merhaba {veli_adi} 👋\n\n{ogrenci_adi} için bugün saat {saat} antrenmanımız var. Görüşmek üzere!\n\nFootbalLab Futbol Okulu",
  },
  payment_reminder: {
    title: "Ödeme Hatırlatıcısı",
    variables: [PARENT, STUDENT, { key: "tarih", label: "Ödeme tarihi", sample: "15.12.2026" }, { key: "tutar", label: "Tutar", sample: "2.500" }],
    defaultText:
      "Merhaba {veli_adi} 👋\n\n{ogrenci_adi} için {tarih} tarihinde ödenecek {tutar} TL tutarındaki ödemeniz bulunmaktadır.\n\nSorularınız için bize WhatsApp üzerinden yazabilirsiniz.\n\nFootbalLab Futbol Okulu",
  },
  birthday_greeting: {
    title: "Doğum Günü Kutlaması",
    variables: [PARENT, STUDENT],
    defaultText: "Merhaba {veli_adi} 🎂\n\n{ogrenci_adi}'in doğum gününü kutlar, nice mutlu ve sağlıklı yıllar dileriz!\n\nFootbalLab Futbol Okulu",
  },
  anniversary_greeting: {
    title: "Kayıt Yıl Dönümü",
    variables: [PARENT, STUDENT, { key: "yil", label: "Kaçıncı yıl", sample: "2" }],
    defaultText: "Merhaba {veli_adi} ⚽\n\n{ogrenci_adi} ile birlikte {yil}. yılımızı tamamladık. Bize güvendiğiniz için teşekkür ederiz!\n\nFootbalLab Futbol Okulu",
  },
};

/** {degisken} yer tutucularını verilen değerlerle doldurur; bilinmeyenler olduğu gibi kalır. */
export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k] : m));
}

/** Metindeki tanımsız değişkenleri döndürür (yazım hatası uyarısı için). */
export function unknownVariables(text: string, allowed: AutoMessageVariable[]): string[] {
  const ok = new Set(allowed.map((v) => v.key));
  return Array.from(new Set(Array.from(text.matchAll(/\{(\w+)\}/g)).map((m) => m[1]))).filter((k) => !ok.has(k));
}

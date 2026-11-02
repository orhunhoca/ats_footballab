/**
 * Türkiye telefon numaralarını WhatsApp Cloud API'nin beklediği biçime çevirir
 * (yalnızca rakamlar, ülke kodu dahil: 905321234567).
 * Geçersizse null döner.
 */
export function normalizeTrPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits;
  // Yurt dışı numaraları: 8-15 hane
  if (digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

/** 905321234567 -> 0532 123 45 67 (gösterim için) */
export function formatTrPhone(raw: string | null | undefined): string {
  const n = normalizeTrPhone(raw);
  if (!n) return raw ?? "";
  if (n.startsWith("90") && n.length === 12) {
    const l = n.slice(2);
    return `0${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6, 8)} ${l.slice(8)}`;
  }
  return `+${n}`;
}

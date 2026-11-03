/** Boşlukları temizler, büyük harfe çevirir: "tr33 0006 ..." -> "TR330006..." */
export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** TR IBAN: "TR" + 24 rakam (toplam 26), ISO 13616 mod-97 sağlama toplamı geçerli olmalı */
export function isValidTrIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^TR[0-9]{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  return remainder === 1;
}

/** TR33 0006 1005 1978 6457 8413 26 biçiminde gösterir */
export function formatIban(raw: string): string {
  return normalizeIban(raw).replace(/(.{4})/g, "$1 ").trim();
}

import { normalizeTrPhone } from "@/lib/phone";

export interface ParentRecipient {
  id: "mother" | "father";
  label: string;
  name: string;
  phone: string;
  /** WhatsApp için normalize edilmiş numara (905XXXXXXXXX) */
  normalized: string;
}

interface ParentFields {
  mother_name?: string | null;
  mother_phone?: string | null;
  father_name?: string | null;
  father_phone?: string | null;
}

/** Öğrencinin geçerli anne/baba numaraları; aynı numara iki kez dönmez. */
export function getParentRecipients(student: ParentFields): ParentRecipient[] {
  const list: ParentRecipient[] = [];
  const seen = new Set<string>();
  const candidates = [
    { id: "mother" as const, label: "Anne", name: student.mother_name, phone: student.mother_phone },
    { id: "father" as const, label: "Baba", name: student.father_name, phone: student.father_phone },
  ];
  for (const c of candidates) {
    const normalized = normalizeTrPhone(c.phone);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push({
      id: c.id,
      label: c.label,
      name: c.name?.trim() || `${c.label} (veli)`,
      phone: c.phone ?? "",
      normalized,
    });
  }
  return list;
}

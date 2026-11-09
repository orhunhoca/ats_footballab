import { isAgeEligible, isFull, remaining, type Occupancy } from "@/lib/groupRules";

interface RecGroup {
  id: string;
  status: string | null;
  branch_id: string | null;
  age_min?: number | null;
  age_max?: number | null;
  target_years?: string | null;
}

export interface Recommendation<G extends RecGroup> {
  /** doğum yılına uyan, aktif ve kontenjanı olan gruplar — en uygun olan başta */
  available: G[];
  /** doğum yılına uyan ama kontenjanı dolu gruplar */
  full: G[];
  /** doğum yılına uyan aktif grup hiç yok */
  noneDefined: boolean;
}

/**
 * Doğum tarihine göre grup önerisi: (1) şubedeki aktif gruplar, (2) doğum yılı grubun yaş aralığına/hedef yıllarına uymalı,
 * (3) kontenjanı olanlar önce; aralarında yaş aralığı en dar (en "özel") grup, sonra en çok boş yeri olan grup.
 */
export function recommendGroups<G extends RecGroup>(
  birthDate: string | null | undefined,
  branchId: string | null | undefined,
  groups: G[],
  occupancy: Record<string, Occupancy>,
  now = new Date()
): Recommendation<G> {
  if (!birthDate) return { available: [], full: [], noneDefined: false };
  const eligible = groups.filter(
    (g) => g.status === "Aktif" && (!branchId || g.branch_id === branchId) && isAgeEligible(g, { birth_date: birthDate }, now)
  );
  const width = (g: G) => (g.age_min != null && g.age_max != null ? g.age_max - g.age_min : 99);
  const left = (g: G) => remaining(occupancy[g.id]) ?? 9999;
  const available = eligible
    .filter((g) => !isFull(occupancy[g.id]))
    .sort((a, b) => width(a) - width(b) || left(b) - left(a));
  const full = eligible.filter((g) => isFull(occupancy[g.id]));
  return { available, full, noneDefined: eligible.length === 0 };
}

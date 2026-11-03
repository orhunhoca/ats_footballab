import { supabase } from "@/integrations/supabase/client";
import { SCHOOL_NORM_MIN_N, type NormRef } from "@/lib/testNorms";
import type { StudentAnalysis } from "@/lib/performanceAnalysis";

interface SchoolNormRow {
  protocol_id: string;
  n: number;
  p25: number;
  p50: number;
  p75: number;
}

/**
 * Okulun kendi verisinden normlar (test_protocol_id -> NormRef). Yetersiz veri/yetki/hata durumunda boş döner;
 * analiz otomatik olarak başlangıç referanslarına düşer.
 */
export const normService = {
  async getSchoolNorms(
    age: number | null | undefined,
    directions: Record<string, "lower" | "higher">
  ): Promise<Record<string, NormRef>> {
    if (!age) return {};
    const { data, error } = await supabase.rpc("get_school_norms", { p_age: age, p_min_n: SCHOOL_NORM_MIN_N });
    if (error || !Array.isArray(data)) return {};
    const out: Record<string, NormRef> = {};
    for (const row of data as unknown as SchoolNormRow[]) {
      const dir = directions[row.protocol_id];
      if (!dir) continue;
      const p25 = Number(row.p25);
      const p50 = Number(row.p50);
      const p75 = Number(row.p75);
      out[row.protocol_id] =
        dir === "higher"
          ? { weak: p25, median: p50, strong: p75, source: "okul", n: row.n }
          : { weak: p75, median: p50, strong: p25, source: "okul", n: row.n };
    }
    return out;
  },

  /** Bir öğrencinin analizinden okul normu sorgusu için yönleri çıkarır */
  directionsOf(analysis: StudentAnalysis): Record<string, "lower" | "higher"> {
    return Object.fromEntries(analysis.metrics.map((m) => [m.key, m.direction]));
  },
};

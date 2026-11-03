import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { buildRuleTechniqueFeedback, type TechniqueResult } from "@/lib/measure/techniqueMetrics";

export type TechniqueAnalysisRow = Tables<"technique_analyses">;

export interface TechniqueFeedback {
  analysis: string;
  parentSummary: string;
  aiGenerated: boolean;
  notice?: string;
}

export const techniqueService = {
  /** Yapay zekâ yorumu; ulaşılamazsa kural tabanlı geri bildirime düşer (video/görüntü gönderilmez, yalnız sayılar) */
  async analyze(result: TechniqueResult, studentName: string, age?: number | null): Promise<TechniqueFeedback> {
    const rule: TechniqueFeedback = { analysis: buildRuleTechniqueFeedback(result, studentName), parentSummary: "", aiGenerated: false };
    if (result.metrics.length === 0) return rule;
    try {
      const { data, error } = await supabase.functions.invoke("analyze-technique", {
        body: { kind: result.kind, age: age ?? null, quality: result.quality, kickingLeg: result.kickingLeg, metrics: result.metrics },
      });
      if (error) throw error;
      if (!data?.configured) return { ...rule, notice: "Yapay zekâ anahtarı tanımlı değil; genel ilkelere dayalı otomatik geri bildirim gösteriliyor." };
      if (!data.analysis) throw new Error("Boş yanıt");
      return { analysis: `## ${studentName} — ${result.kind === "run" ? "Koşu" : "Şut"} Tekniği\n\n${data.analysis}`, parentSummary: data.parentSummary || "", aiGenerated: true };
    } catch (e) {
      console.error("Technique AI unavailable:", e);
      return { ...rule, notice: "Yapay zekâ servisine ulaşılamadı; genel ilkelere dayalı otomatik geri bildirim gösteriliyor." };
    }
  },

  async save(studentId: string, result: TechniqueResult, feedback: TechniqueFeedback): Promise<TechniqueAnalysisRow> {
    const { data, error } = await supabase
      .from("technique_analyses")
      .insert({
        student_id: studentId,
        kind: result.kind,
        metrics: result.metrics as unknown as never,
        quality: result.quality as unknown as never,
        analysis: feedback.analysis,
        ai_generated: feedback.aiGenerated,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async list(studentId: string): Promise<TechniqueAnalysisRow[]> {
    const { data, error } = await supabase
      .from("technique_analyses")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  },
};

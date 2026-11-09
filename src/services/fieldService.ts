import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type BranchField = Tables<"branch_fields">;
type FieldInsert = Database["public"]["Tables"]["branch_fields"]["Insert"];

export interface FieldInput {
  name: string;
  open_time: string;
  close_time: string;
  capacity: number;
}

const hhmm = (t: string) => t.slice(0, 5);

function friendly(error: { code?: string; message?: string }): Error {
  if (error.code === "23505") return new Error("Bu şubede aynı isimde bir saha zaten var.");
  if (error.code === "23514") return new Error("Saha bilgileri geçersiz: kapanış saati açılıştan sonra, kontenjan 1 veya daha fazla olmalı.");
  if (error.code === "23503") return new Error("Bu sahaya bağlı gruplar var; sahayı silmek yerine pasife alın.");
  if (error.code === "42501") return new Error("Saha eklemek/düzenlemek için yönetici (admin) yetkisi gerekir.");
  return new Error(error.message || "İşlem yapılamadı.");
}

export const fieldService = {
  /** Sahaları listeler (şube verilirse yalnız o şubenin); varsayılan olarak pasifler dahil */
  async list(branchId?: string | null): Promise<BranchField[]> {
    let q = supabase.from("branch_fields").select("*").order("name", { ascending: true });
    if (branchId) q = q.eq("branch_id", branchId);
    const { data, error } = await q;
    if (error) throw friendly(error);
    return data ?? [];
  },

  validate(f: FieldInput): string | null {
    if (!f.name.trim()) return "Saha adı zorunlu.";
    if (!f.open_time || !f.close_time) return "Sahanın açılış ve kapanış saatini girin.";
    if (hhmm(f.close_time) <= hhmm(f.open_time)) return "Kapanış saati açılış saatinden sonra olmalı.";
    if (!Number.isInteger(f.capacity) || f.capacity < 1) return "Sahanın 1 saatlik öğrenci kontenjanı zorunlu (en az 1).";
    return null;
  },

  async createMany(branchId: string, fields: FieldInput[]): Promise<BranchField[]> {
    const rows: FieldInsert[] = fields.map((f) => ({
      branch_id: branchId,
      name: f.name.trim(),
      open_time: hhmm(f.open_time),
      close_time: hhmm(f.close_time),
      capacity: f.capacity,
    }));
    const { data, error } = await supabase.from("branch_fields").insert(rows).select();
    if (error) throw friendly(error);
    return data ?? [];
  },

  async update(id: string, patch: Partial<FieldInput> & { is_active?: boolean }): Promise<BranchField> {
    const payload: Database["public"]["Tables"]["branch_fields"]["Update"] = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) payload.name = patch.name.trim();
    if (patch.open_time !== undefined) payload.open_time = hhmm(patch.open_time);
    if (patch.close_time !== undefined) payload.close_time = hhmm(patch.close_time);
    if (patch.capacity !== undefined) payload.capacity = patch.capacity;
    if (patch.is_active !== undefined) payload.is_active = patch.is_active;
    const { data, error } = await supabase.from("branch_fields").update(payload).eq("id", id).select().single();
    if (error) throw friendly(error);
    return data;
  },
};

export const formatFieldHours = (f: Pick<BranchField, "open_time" | "close_time">) => `${hhmm(f.open_time)}–${hhmm(f.close_time)}`;

import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type Branch = Tables<"branches">;
type BranchInsert = Database["public"]["Tables"]["branches"]["Insert"];
type BranchUpdate = Database["public"]["Tables"]["branches"]["Update"];

export interface BranchUsage {
  students: number;
  coaches: number;
  groups: number;
}

export const branchService = {
  /** Tüm şubeler (pasifler dahil), ada göre sıralı */
  async getAll(): Promise<Branch[]> {
    const { data, error } = await supabase.from("branches").select("*").order("name", { ascending: true });
    if (error) {
      console.error("Error fetching branches:", error);
      throw error;
    }
    return data || [];
  },

  async create(branch: Pick<BranchInsert, "name" | "address" | "phone">): Promise<Branch> {
    const { data, error } = await supabase
      .from("branches")
      .insert({
        name: branch.name.trim(),
        address: branch.address?.trim() || null,
        phone: branch.phone?.trim() || null,
      })
      .select()
      .single();
    if (error) throw this.friendlyError(error);
    return data;
  },

  async update(id: string, updates: Pick<BranchUpdate, "name" | "address" | "phone" | "is_active">): Promise<Branch> {
    const payload: BranchUpdate = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.address !== undefined) payload.address = updates.address?.trim() || null;
    if (updates.phone !== undefined) payload.phone = updates.phone?.trim() || null;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;

    const { data, error } = await supabase.from("branches").update(payload).eq("id", id).select().single();
    if (error) throw this.friendlyError(error);
    return data;
  },

  /** Bağlı kaydı olmayan şubeyi siler; aksi halde pasife almayı önerir. */
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) throw this.friendlyError(error);
  },

  /** Şube başına öğrenci/antrenör/grup sayıları */
  async getUsage(): Promise<Record<string, BranchUsage>> {
    const [students, coaches, groups] = await Promise.all([
      supabase.from("students").select("branch_id"),
      supabase.from("coaches").select("branch_id"),
      supabase.from("groups").select("branch_id"),
    ]);
    const usage: Record<string, BranchUsage> = {};
    const bump = (rows: { branch_id: string | null }[] | null, key: keyof BranchUsage) => {
      for (const r of rows || []) {
        if (!r.branch_id) continue;
        usage[r.branch_id] = usage[r.branch_id] || { students: 0, coaches: 0, groups: 0 };
        usage[r.branch_id][key]++;
      }
    };
    bump(students.data, "students");
    bump(coaches.data, "coaches");
    bump(groups.data, "groups");
    return usage;
  },

  friendlyError(error: { code?: string; message: string }): Error {
    if (error.code === "23505") return new Error("Bu isimde bir şube zaten var.");
    if (error.code === "23503") {
      return new Error("Bu şubeye bağlı öğrenci, antrenör, grup veya ödeme kayıtları var. Silmek yerine pasife alın.");
    }
    if (error.code === "42501") return new Error("Bu işlem için yönetici yetkisi gerekir.");
    return new Error(error.message);
  },
};

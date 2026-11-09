import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

type Coach = Tables<"coaches">;
type CoachInsert = Database["public"]["Tables"]["coaches"]["Insert"];
type CoachUpdate = Database["public"]["Tables"]["coaches"]["Update"];

export const coachService = {
  // Get all coaches with their groups
  async getAllCoaches(branchId?: string | null) {
    let query = supabase
      .from("coaches")
      .select(`
        *,
        groups!groups_coach_id_fkey(*),
        coach_branches(branch_id)
      `)
      .eq("status", "Aktif")
      .order("created_at", { ascending: false });
    // Şube filtresi: ana şubesi ya da çalıştığı şubelerden biri o şube olan antrenörler
    if (branchId) {
      const { data: rows } = await supabase.from("coach_branches").select("coach_id").eq("branch_id", branchId);
      const ids = (rows ?? []).map((r) => r.coach_id);
      query = ids.length > 0 ? query.or(`branch_id.eq.${branchId},id.in.(${ids.join(",")})`) : query.eq("branch_id", branchId);
    }
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching coaches:", error);
      throw error;
    }

    return data || [];
  },

  /** Antrenörün çalıştığı şubeleri değiştirir (yalnız admin) */
  async setBranches(coachId: string, branchIds: string[]) {
    const { error: delError } = await supabase.from("coach_branches").delete().eq("coach_id", coachId);
    if (delError) throw delError;
    if (branchIds.length === 0) return;
    const { error } = await supabase.from("coach_branches").insert(branchIds.map((b) => ({ coach_id: coachId, branch_id: b })));
    if (error) throw error;
  },

  // Get coach by ID
  async getCoachById(id: string) {
    const { data, error } = await supabase
      .from("coaches")
      .select(`
        *,
        groups!groups_coach_id_fkey(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching coach:", error);
      throw error;
    }

    return data;
  },

  // Create new coach
  async createCoach(coach: CoachInsert) {
    const { data, error } = await supabase
      .from("coaches")
      .insert(coach)
      .select()
      .single();

    if (error) {
      console.error("Error creating coach:", error);
      throw error;
    }

    return data;
  },

  // Update coach
  async updateCoach(id: string, updates: CoachUpdate) {
    const { data, error } = await supabase
      .from("coaches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating coach:", error);
      throw error;
    }

    return data;
  },

  // Delete coach (soft delete)
  async deleteCoach(id: string) {
    const { error } = await supabase
      .from("coaches")
      .update({ status: "Pasif" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting coach:", error);
      throw error;
    }
  },

  // Search coaches
  async searchCoaches(searchTerm: string) {
    const { data, error } = await supabase
      .from("coaches")
      .select(`
        *,
        groups!groups_coach_id_fkey(*)
      `)
      .eq("status", "Aktif")
      .or(`name.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching coaches:", error);
      throw error;
    }

    return data || [];
  },

  // Get coach statistics
  async getCoachStats(branchId?: string | null) {
    let totalQuery = supabase.from("coaches").select("*", { count: "exact", head: true });
    let activeQuery = supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })
      .eq("status", "Aktif");
    if (branchId) {
      totalQuery = totalQuery.eq("branch_id", branchId);
      activeQuery = activeQuery.eq("branch_id", branchId);
    }
    const { count: totalCount, error: totalError } = await totalQuery;
    const { count: activeCount, error: activeError } = await activeQuery;

    if (totalError || activeError) {
      console.error("Error fetching stats:", totalError || activeError);
      throw totalError || activeError;
    }

    return {
      total: totalCount || 0,
      active: activeCount || 0,
      inactive: (totalCount || 0) - (activeCount || 0)
    };
  }
};
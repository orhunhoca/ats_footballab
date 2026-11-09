import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";
import type { Occupancy, Session } from "@/lib/groupRules";

type Group = Tables<"groups">;
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];

export const groupService = {
  // Get all groups with coach and students count
  async getAllGroups(branchId?: string | null) {
    let query = supabase
      .from("groups")
      .select(`
        *,
        coaches!groups_coach_id_fkey(*),
        student_groups!student_groups_group_id_fkey(
          students!student_groups_student_id_fkey(*)
        )
      `)
      .order("name", { ascending: true });
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching groups:", error);
      throw error;
    }

    // Transform data to include student_count and students array
    return data?.map(group => ({
      ...group,
      student_count: group.student_groups?.length || 0,
      students: group.student_groups?.map((sg: any) => sg.students).filter(Boolean) || []
    })) || [];
  },

  /** Grupların doluluğu (kayıtlı öğrenci + bekleyen deneme öğrencisi / kontenjan) */
  async getOccupancy(): Promise<Record<string, Occupancy>> {
    const { data, error } = await supabase.from("group_occupancy").select("*");
    if (error) throw error;
    const out: Record<string, Occupancy> = {};
    for (const r of data ?? []) {
      if (r.group_id) out[r.group_id] = { enrolled: r.enrolled ?? 0, trial_pending: r.trial_pending ?? 0, capacity: r.capacity };
    }
    return out;
  },

  /** Grubun haftalık antrenman seansları */
  async getSessions(groupId: string): Promise<Session[]> {
    const { data, error } = await supabase.from("group_schedule").select("day_of_week, start_time, end_time").eq("group_id", groupId);
    if (error) throw error;
    return data ?? [];
  },

  /** Tüm grupların seansları (grup id → seanslar) */
  async getAllSessions(): Promise<Record<string, Session[]>> {
    const { data, error } = await supabase.from("group_schedule").select("group_id, day_of_week, start_time, end_time");
    if (error) throw error;
    const out: Record<string, Session[]> = {};
    for (const r of data ?? []) (out[r.group_id] ||= []).push({ day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time });
    return out;
  },

  /**
   * Seansları değiştirir. Veritabanı çakışma/saat/kontenjan kurallarını denetler; hata olursa eski seanslar geri yazılır.
   */
  async replaceSessions(groupId: string, next: Session[], previous: Session[]): Promise<void> {
    const { error: delError } = await supabase.from("group_schedule").delete().eq("group_id", groupId);
    if (delError) throw delError;
    if (next.length === 0) return;
    const { error } = await supabase.from("group_schedule").insert(next.map((x) => ({ group_id: groupId, ...x })));
    if (error) {
      if (previous.length > 0) {
        await supabase.from("group_schedule").insert(previous.map((x) => ({ group_id: groupId, ...x })));
      }
      throw error;
    }
  },

  // Get group by ID
  async getGroupById(id: string) {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        coaches!groups_coach_id_fkey(*),
        student_groups!student_groups_group_id_fkey(
          students!student_groups_student_id_fkey(*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching group:", error);
      throw error;
    }

    return data;
  },

  // Create new group
  async createGroup(group: GroupInsert) {
    const { data, error } = await supabase
      .from("groups")
      .insert(group)
      .select()
      .single();

    if (error) {
      console.error("Error creating group:", error);
      throw error;
    }

    return data;
  },

  // Update group
  async updateGroup(id: string, updates: GroupUpdate) {
    const { data, error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating group:", error);
      throw error;
    }

    return data;
  },

  /**
   * Silmeyi engelleyen bağlı kayıtlar. Grup silinirse yoklama geçmişi, haftalık program ve antrenman atamaları da
   * (veritabanında ON DELETE CASCADE) silinir; öğrencilerin grup bağlantısı kalkar. Bu yüzden öğrencisi,
   * yoklaması ya da atanmış deneme öğrencisi olan grup silinmez, Pasif yapılır.
   */
  async getDeleteBlockers(id: string): Promise<{ students: number; attendance: number; trialStudents: number }> {
    const [sg, att, trial] = await Promise.all([
      supabase.from("student_groups").select("id", { count: "exact", head: true }).eq("group_id", id),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("group_id", id),
      supabase.from("trial_students").select("id", { count: "exact", head: true }).eq("assigned_group_id", id),
    ]);
    if (sg.error) throw sg.error;
    if (att.error) throw att.error;
    if (trial.error) throw trial.error;
    const students = sg.count ?? 0;
    const attendance = att.count ?? 0;
    const trialStudents = trial.count ?? 0;
    return { students, attendance, trialStudents };
  },

  // Delete group
  async deleteGroup(id: string) {
    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting group:", error);
      throw error;
    }
  },

  // Get group statistics
  async getGroupStats() {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id,
        student_groups!student_groups_group_id_fkey(count)
      `);

    if (error) {
      console.error("Error fetching group stats:", error);
      throw error;
    }

    return data || [];
  }
};
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];

export const groupService = {
  // Get all groups with coach and students count
  async getAllGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        coaches!groups_coach_id_fkey(*),
        student_groups!student_groups_group_id_fkey(
          students!student_groups_student_id_fkey(*)
        )
      `)
      .order("name", { ascending: true });

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
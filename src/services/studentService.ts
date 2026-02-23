import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Student = Tables<"students">;
type StudentInsert = TablesInsert<"students">;
type StudentUpdate = TablesUpdate<"students">;

export const studentService = {
  // Get all students with their groups
  async getAllStudents() {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        student_groups!student_groups_student_id_fkey(
          groups!student_groups_group_id_fkey(*)
        )
      `)
      .eq("status", "Aktif")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
      throw error;
    }

    return data || [];
  },

  // Get student by ID
  async getStudentById(id: string) {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        student_groups!student_groups_student_id_fkey(
          groups!student_groups_group_id_fkey(*)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching student:", error);
      throw error;
    }

    return data;
  },

  // Create new student
  async createStudent(student: StudentInsert) {
    const { data, error } = await supabase
      .from("students")
      .insert(student)
      .select()
      .single();

    if (error) {
      console.error("Error creating student:", error);
      throw error;
    }

    return data;
  },

  // Update student
  async updateStudent(id: string, updates: StudentUpdate) {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating student:", error);
      throw error;
    }

    return data;
  },

  // Delete student (soft delete)
  async deleteStudent(id: string) {
    const { error } = await supabase
      .from("students")
      .update({ status: "Pasif" })
      .eq("id", id);

    if (error) {
      console.error("Error deleting student:", error);
      throw error;
    }
  },

  // Assign student to group
  async assignToGroup(studentId: string, groupId: string) {
    const { data, error } = await supabase
      .from("student_groups")
      .insert({ student_id: studentId, group_id: groupId })
      .select()
      .single();

    if (error) {
      console.error("Error assigning student to group:", error);
      throw error;
    }

    return data;
  },

  // Remove student from group
  async removeFromGroup(studentId: string, groupId: string) {
    const { error } = await supabase
      .from("student_groups")
      .delete()
      .eq("student_id", studentId)
      .eq("group_id", groupId);

    if (error) {
      console.error("Error removing student from group:", error);
      throw error;
    }
  },

  // Search students
  async searchStudents(searchTerm: string) {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        student_groups!student_groups_student_id_fkey(
          groups!student_groups_group_id_fkey(*)
        )
      `)
      .eq("status", "Aktif")
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching students:", error);
      throw error;
    }

    return data || [];
  },

  // Get student statistics
  async getStudentStats() {
    const { count: totalCount, error: totalError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    const { count: activeCount, error: activeError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "Aktif");

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
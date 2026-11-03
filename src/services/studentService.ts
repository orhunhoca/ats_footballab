import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

export const studentService = {
  // Get all students with their groups
  async getAllStudents(branchId?: string | null): Promise<Student[]> {
    let query = supabase
      .from("students")
      .select(`
        *,
        student_groups!student_groups_student_id_fkey(
          group_id,
          groups!student_groups_group_id_fkey(
            id,
            name
          )
        )
      `)
      .order("created_at", { ascending: false });
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  // Get student by ID
  async getStudentById(id: string) {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        student_groups!student_groups_student_id_fkey(
          group_id,
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

  // Update student status (Delete/Archive)
  async updateStudentStatus(id: string, status: string) {
    const { error } = await supabase
      .from("students")
      .update({ status: status })
      .eq("id", id);

    if (error) {
      console.error("Error updating student status:", error);
      throw error;
    }
  },

  // Assign student to a group (with duplicate prevention)
  async assignToGroup(studentId: string, groupId: string): Promise<void> {
    // First, check if this assignment already exists
    const { data: existing } = await supabase
      .from("student_groups")
      .select("*")
      .eq("student_id", studentId)
      .eq("group_id", groupId)
      .maybeSingle();

    // If already assigned to this group, do nothing (no error)
    if (existing) {
      console.log("Student already assigned to this group, skipping...");
      return;
    }

    // If not assigned, create new assignment
    const { error } = await supabase
      .from("student_groups")
      .insert({
        student_id: studentId,
        group_id: groupId,
      });

    if (error) {
      console.error("Error assigning student to group:", error);
      throw error;
    }
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
  async getStudentStats(branchId?: string | null) {
    let totalQuery = supabase.from("students").select("*", { count: "exact", head: true });
    let activeQuery = supabase
      .from("students")
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
  },

  // Get students with expiring registrations (within X days)
  async getExpiringRegistrations(daysThreshold: number = 20) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);
    
    const { data, error } = await supabase
      .from("students")
      .select("id, name, registration_end_date, mother_phone, father_phone")
      .eq("status", "Aktif")
      .lte("registration_end_date", futureDate.toISOString().split('T')[0])
      .gte("registration_end_date", today.toISOString().split('T')[0])
      .order("registration_end_date", { ascending: true });

    if (error) {
      console.error("Error fetching expiring registrations:", error);
      throw error;
    }

    return data || [];
  }
};
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

export const studentService = {
  // Get all students with their groups
  async getAllStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

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

  // Get financial report (Admin only)
  async getFinancialReport(period: "weekly" | "monthly") {
    const today = new Date();
    const startDate = new Date();

    if (period === "weekly") {
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate.setMonth(today.getMonth() - 1);
    }

    const { data, error } = await supabase
      .from("students")
      .select("payment_amount, registration_type, created_at, summer_clothing_paid, winter_clothing_paid, summer_clothing_price, winter_clothing_price")
      .gte("created_at", startDate.toISOString());

    if (error) {
      console.error("Error fetching financial report:", error);
      throw error;
    }

    // Process data
    const report = {
      totalRevenue: 0,
      newRegistrationRevenue: 0,
      renewalRevenue: 0,
      clothingRevenue: 0,
      newRegistrationsCount: 0,
      renewalsCount: 0
    };

    data?.forEach(student => {
      const amount = Number(student.payment_amount) || 0;
      report.totalRevenue += amount;
      
      if (student.registration_type === "Yeni Kayıt") {
        report.newRegistrationRevenue += amount;
        report.newRegistrationsCount++;
      } else {
        report.renewalRevenue += amount;
        report.renewalsCount++;
      }

      // Calculate clothing revenue separately
      if (student.summer_clothing_paid) {
        const summerPrice = Number(student.summer_clothing_price) || 3000;
        report.clothingRevenue += summerPrice;
        report.totalRevenue += summerPrice;
      }
      
      if (student.winter_clothing_paid) {
        const winterPrice = Number(student.winter_clothing_price) || 3000;
        report.clothingRevenue += winterPrice;
        report.totalRevenue += winterPrice;
      }
    });

    return report;
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
      .gte("registration_end_date", today.toISOString().split('T')[0]) // Don't show already expired ones in this specific list if preferred, or remove this line to show all expired
      .order("registration_end_date", { ascending: true });

    if (error) {
      console.error("Error fetching expiring registrations:", error);
      throw error;
    }

    return data || [];
  }
};
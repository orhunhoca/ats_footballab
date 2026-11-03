import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

type FinancialRow = {
  branch_id: string | null;
  payment_amount: number | string | null;
  registration_type: string | null;
  created_at: string | null;
  summer_clothing_paid: boolean | null;
  winter_clothing_paid: boolean | null;
  summer_clothing_price: number | string | null;
  winter_clothing_price: number | string | null;
};

export interface FinancialSummary {
  totalRevenue: number;
  newRegistrationRevenue: number;
  renewalRevenue: number;
  clothingRevenue: number;
  newRegistrationsCount: number;
  renewalsCount: number;
}

function summarizeFinancialRows(rows: FinancialRow[]): FinancialSummary {
  const report: FinancialSummary = {
    totalRevenue: 0,
    newRegistrationRevenue: 0,
    renewalRevenue: 0,
    clothingRevenue: 0,
    newRegistrationsCount: 0,
    renewalsCount: 0,
  };

  rows.forEach((student) => {
    const amount = Number(student.payment_amount) || 0;
    report.totalRevenue += amount;

    if (student.registration_type === "Yeni Kayıt") {
      report.newRegistrationRevenue += amount;
      report.newRegistrationsCount++;
    } else {
      report.renewalRevenue += amount;
      report.renewalsCount++;
    }

    // Kıyafet gelirini ayrıca hesapla
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
}

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

  // Get financial report (Admin only). branchId verilirse yalnızca o şube.
  async getFinancialReport(period: "weekly" | "monthly", branchId?: string | null) {
    const rows = await this.fetchFinancialRows(period, branchId);
    return summarizeFinancialRows(rows);
  },

  // Şube bazında mali rapor (anahtar: branch_id, şubesiz kayıtlar "none")
  async getFinancialReportByBranch(period: "weekly" | "monthly") {
    const rows = await this.fetchFinancialRows(period);
    const grouped: Record<string, FinancialRow[]> = {};
    for (const r of rows) {
      const key = r.branch_id || "none";
      (grouped[key] = grouped[key] || []).push(r);
    }
    return Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, summarizeFinancialRows(v)]));
  },

  async fetchFinancialRows(period: "weekly" | "monthly", branchId?: string | null): Promise<FinancialRow[]> {
    const today = new Date();
    const startDate = new Date();

    if (period === "weekly") {
      startDate.setDate(today.getDate() - 7);
    } else {
      startDate.setMonth(today.getMonth() - 1);
    }

    let query = supabase
      .from("students")
      .select("branch_id, payment_amount, registration_type, created_at, summer_clothing_paid, winter_clothing_paid, summer_clothing_price, winter_clothing_price")
      .gte("created_at", startDate.toISOString());
    if (branchId) query = query.eq("branch_id", branchId);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching financial report:", error);
      throw error;
    }
    return (data || []) as FinancialRow[];
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
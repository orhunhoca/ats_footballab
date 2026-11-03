import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

type TrialStudent = Tables<"trial_students">;
type TrialStudentInsert = Database["public"]["Tables"]["trial_students"]["Insert"];
type TrialStudentUpdate = Database["public"]["Tables"]["trial_students"]["Update"];

export const trialStudentService = {
  // Get all trial students
  async getAllTrialStudents(branchId?: string | null) {
    let query = supabase
      .from("trial_students")
      .select(`
        *,
        groups(*)
      `)
      .order("created_at", { ascending: false });
    if (branchId) query = query.eq("branch_id", branchId);
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching trial students:", error);
      throw error;
    }

    return data || [];
  },

  // Get trial student by ID
  async getTrialStudentById(id: string) {
    const { data, error } = await supabase
      .from("trial_students")
      .select(`
        *,
        groups(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching trial student:", error);
      throw error;
    }

    return data;
  },

  // Create new trial student
  async createTrialStudent(student: TrialStudentInsert) {
    const { data, error } = await supabase
      .from("trial_students")
      .insert(student)
      .select()
      .single();

    if (error) {
      console.error("Error creating trial student:", error);
      throw error;
    }

    return data;
  },

  // Update trial student
  async updateTrialStudent(id: string, updates: TrialStudentUpdate) {
    const { data, error } = await supabase
      .from("trial_students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating trial student:", error);
      throw error;
    }

    return data;
  },

  // Delete trial student
  async deleteTrialStudent(id: string) {
    const { error } = await supabase
      .from("trial_students")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting trial student:", error);
      throw error;
    }
  },

  // Convert trial student to full student
  async convertToFullStudent(trialStudentId: string, additionalData: any) {
    // Get trial student data
    const trialStudent = await this.getTrialStudentById(trialStudentId);
    
    if (!trialStudent) {
      throw new Error("Trial student not found");
    }

    // Calculate age
    const birthDate = new Date(trialStudent.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Create full student record with trial data + additional data
    const { data: newStudent, error: createError } = await supabase
      .from("students")
      .insert({
        name: trialStudent.name,
        branch_id: trialStudent.branch_id,
        birth_date: trialStudent.birth_date,
        age: age,
        mother_name: additionalData.mother_name,
        mother_phone: additionalData.mother_phone,
        father_name: additionalData.father_name,
        father_phone: additionalData.father_phone,
        address: additionalData.address,
        height_cm: additionalData.height_cm ? parseInt(additionalData.height_cm) : null,
        weight_kg: additionalData.weight_kg ? parseFloat(additionalData.weight_kg) : null,
        school: additionalData.school || null,
        clothing_size: additionalData.jersey_size || null,
        health_report_submitted: additionalData.health_report === "Var",
        registration_type: additionalData.registration_type,
        payment_plan: additionalData.payment_plan,
        payment_amount: additionalData.payment_amount,
        registration_start_date: additionalData.registration_start_date,
        registration_end_date: additionalData.registration_end_date,
        status: "Aktif"
      })
      .select()
      .single();

    if (createError) {
      console.error("Error converting trial student:", createError);
      throw createError;
    }

    // Assign to selected group
    if (additionalData.group_id && newStudent) {
      await supabase
        .from("student_groups")
        .insert({
          student_id: newStudent.id,
          group_id: additionalData.group_id
        });
    }

    // Update trial student status
    await this.updateTrialStudent(trialStudentId, {
      status: "Kayıt Oldu"
    });

    return newStudent;
  },

  // Get statistics
  async getTrialStats() {
    const { count: totalCount, error: totalError } = await supabase
      .from("trial_students")
      .select("*", { count: "exact", head: true });

    const { count: pendingCount, error: pendingError } = await supabase
      .from("trial_students")
      .select("*", { count: "exact", head: true })
      .eq("status", "Beklemede");

    const { count: convertedCount, error: convertedError } = await supabase
      .from("trial_students")
      .select("*", { count: "exact", head: true })
      .eq("status", "Kayıt Oldu");

    if (totalError || pendingError || convertedError) {
      console.error("Error fetching trial stats:", totalError || pendingError || convertedError);
      throw totalError || pendingError || convertedError;
    }

    return {
      total: totalCount || 0,
      pending: pendingCount || 0,
      converted: convertedCount || 0,
      cancelled: (totalCount || 0) - (pendingCount || 0) - (convertedCount || 0)
    };
  }
};
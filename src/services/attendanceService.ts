import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Attendance = Tables<"attendance">;
type AttendanceInsert = TablesInsert<"attendance">;
type AttendanceUpdate = TablesUpdate<"attendance">;

export const attendanceService = {
  // Get attendance for specific date and group
  async getAttendanceByDate(date: string, groupId?: string) {
    let query = supabase
      .from("attendance")
      .select(`
        *,
        students!attendance_student_id_fkey(*),
        groups!attendance_group_id_fkey(*)
      `)
      .eq("attendance_date", date);

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching attendance:", error);
      throw error;
    }

    return data || [];
  },

  // Get attendance for specific student
  async getStudentAttendance(studentId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from("attendance")
      .select(`
        *,
        groups!attendance_group_id_fkey(*)
      `)
      .eq("student_id", studentId);

    if (startDate) {
      query = query.gte("attendance_date", startDate);
    }
    if (endDate) {
      query = query.lte("attendance_date", endDate);
    }

    const { data, error } = await query.order("attendance_date", { ascending: false });

    if (error) {
      console.error("Error fetching student attendance:", error);
      throw error;
    }

    return data || [];
  },

  // Mark attendance
  async markAttendance(attendance: AttendanceInsert) {
    const { data, error } = await supabase
      .from("attendance")
      .insert(attendance)
      .select()
      .single();

    if (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }

    return data;
  },

  // Update attendance
  async updateAttendance(id: string, updates: AttendanceUpdate) {
    const { data, error } = await supabase
      .from("attendance")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating attendance:", error);
      throw error;
    }

    return data;
  },

  // Bulk mark attendance for a group
  async bulkMarkAttendance(attendanceRecords: AttendanceInsert[]) {
    const { data, error } = await supabase
      .from("attendance")
      .insert(attendanceRecords)
      .select();

    if (error) {
      console.error("Error bulk marking attendance:", error);
      throw error;
    }

    return data || [];
  },

  // Get attendance statistics
  async getAttendanceStats(startDate?: string, endDate?: string) {
    let query = supabase
      .from("attendance")
      .select("status");

    if (startDate) {
      query = query.gte("attendance_date", startDate);
    }
    if (endDate) {
      query = query.lte("attendance_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching attendance stats:", error);
      throw error;
    }

    const stats = {
      total: data?.length || 0,
      present: data?.filter(a => a.status === "present").length || 0,
      absent: data?.filter(a => a.status === "absent").length || 0,
      excused: data?.filter(a => a.status === "excused").length || 0
    };

    return {
      ...stats,
      attendanceRate: stats.total > 0 
        ? Math.round((stats.present / stats.total) * 100) 
        : 0
    };
  },

  // Get group attendance rate
  async getGroupAttendanceRate(groupId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from("attendance")
      .select("status")
      .eq("group_id", groupId);

    if (startDate) {
      query = query.gte("attendance_date", startDate);
    }
    if (endDate) {
      query = query.lte("attendance_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching group attendance rate:", error);
      throw error;
    }

    const total = data?.length || 0;
    const present = data?.filter(a => a.status === "present").length || 0;

    return total > 0 ? Math.round((present / total) * 100) : 0;
  }
};
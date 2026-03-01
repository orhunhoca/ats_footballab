import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TrainingProgram = Tables<"training_programs">;
export type TrainingExercise = Tables<"training_exercises">;
export type GroupTrainingAssignment = Tables<"group_training_assignments">;

export type TrainingCategory = 
  | "defense" 
  | "offense" 
  | "coordination" 
  | "transitions" 
  | "technical" 
  | "conditioning" 
  | "tactical";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

interface CreateProgramData {
  name: string;
  category: TrainingCategory;
  week_number: number;
  session_number: number;
  difficulty_level: DifficultyLevel;
  duration_minutes: number;
  description?: string;
}

interface CreateExerciseData {
  program_id: string;
  exercise_name: string;
  duration_minutes: number;
  equipment_needed?: string[];
  instructions?: string;
  order_number: number;
}

/**
 * Create a new training program
 */
export async function createTrainingProgram(data: CreateProgramData) {
  const { data: program, error } = await supabase
    .from("training_programs")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error creating training program:", error);
    throw error;
  }

  return program;
}

/**
 * Add exercise to a training program
 */
export async function addExerciseToProgram(data: CreateExerciseData) {
  const { data: exercise, error } = await supabase
    .from("training_exercises")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error adding exercise:", error);
    throw error;
  }

  return exercise;
}

/**
 * Get all training programs with exercises
 */
export async function getAllTrainingPrograms() {
  const { data, error } = await supabase
    .from("training_programs")
    .select(`
      *,
      training_exercises (*)
    `)
    .order("week_number", { ascending: true })
    .order("session_number", { ascending: true });

  if (error) {
    console.error("Error fetching training programs:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get training programs by category
 */
export async function getProgramsByCategory(category: TrainingCategory) {
  const { data, error } = await supabase
    .from("training_programs")
    .select(`
      *,
      training_exercises (*)
    `)
    .eq("category", category)
    .order("week_number", { ascending: true });

  if (error) {
    console.error("Error fetching programs by category:", error);
    throw error;
  }

  return data || [];
}

/**
 * Assign training program to a group
 */
export async function assignProgramToGroup(
  groupId: string,
  programId: string,
  scheduledDate: string
) {
  const { data, error } = await supabase
    .from("group_training_assignments")
    .insert({
      group_id: groupId,
      training_program_id: programId,
      scheduled_date: scheduledDate,
      status: "planned"
    })
    .select()
    .single();

  if (error) {
    console.error("Error assigning program to group:", error);
    throw error;
  }

  return data;
}

/**
 * Get training assignments for a group
 */
export async function getGroupTrainingAssignments(groupId: string) {
  const { data, error } = await supabase
    .from("group_training_assignments")
    .select(`
      *,
      training_programs (
        *,
        training_exercises (*)
      ),
      groups (name)
    `)
    .eq("group_id", groupId)
    .order("scheduled_date", { ascending: false });

  if (error) {
    console.error("Error fetching group assignments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update training assignment status
 */
export async function updateAssignmentStatus(
  assignmentId: string,
  status: "planned" | "completed" | "cancelled",
  notes?: string
) {
  const { data, error } = await supabase
    .from("group_training_assignments")
    .update({ status, notes })
    .eq("id", assignmentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating assignment status:", error);
    throw error;
  }

  return data;
}

/**
 * Delete training program (and all related exercises)
 */
export async function deleteTrainingProgram(programId: string) {
  // Delete exercises first
  await supabase
    .from("training_exercises")
    .delete()
    .eq("program_id", programId);

  // Delete program
  const { error } = await supabase
    .from("training_programs")
    .delete()
    .eq("id", programId);

  if (error) {
    console.error("Error deleting training program:", error);
    throw error;
  }
}

/**
 * Get upcoming training sessions (next 7 days)
 */
export async function getUpcomingTrainingSessions() {
  const now = new Date();
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);

  const { data, error } = await supabase
    .from("group_training_assignments")
    .select(`
      *,
      training_programs (
        name,
        category,
        duration_minutes
      ),
      groups (name)
    `)
    .gte("scheduled_date", now.toISOString())
    .lte("scheduled_date", weekLater.toISOString())
    .eq("status", "planned")
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming sessions:", error);
    throw error;
  }

  return data || [];
}
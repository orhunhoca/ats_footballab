import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { DrillKind } from "@/lib/training/drills";

export type CustomDrill = Database["public"]["Tables"]["training_custom_drills"]["Row"];

export interface CustomDrillInput {
  name: string;
  kind: DrillKind;
  min_age: number;
  max_age: number;
  suggested_minutes: number | null;
  players: string | null;
  goal: string | null;
  setup: string | null;
  how: string[];
  points: string[];
  easier: string | null;
  harder: string | null;
  materials: string[];
}

/** Hocaların kütüphaneye eklediği egzersizler (ekleyen kişi sunucuda atanır). */
export const trainingLibraryService = {
  async list(): Promise<CustomDrill[]> {
    const { data, error } = await supabase.from("training_custom_drills").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(input: CustomDrillInput): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Oturum bulunamadı.");
    const { error } = await supabase.from("training_custom_drills").insert({ ...input, created_by: auth.user.id });
    if (error) throw error;
  },

  async update(id: string, input: CustomDrillInput): Promise<void> {
    const { error } = await supabase.from("training_custom_drills").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("training_custom_drills").delete().eq("id", id);
    if (error) throw error;
  },
};

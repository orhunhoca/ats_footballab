import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PaymentPlan = Tables<"payment_plans">;
export type PaymentPlanInsert = TablesInsert<"payment_plans">;
export type PaymentPlanUpdate = TablesUpdate<"payment_plans">;

export type Setting = Tables<"settings">;
export type SettingInsert = TablesInsert<"settings">;
export type SettingUpdate = TablesUpdate<"settings">;

// Payment Plans
export const settingsService = {
  // Get all active payment plans
  async getPaymentPlans(): Promise<PaymentPlan[]> {
    const { data, error } = await supabase
      .from("payment_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching payment plans:", error);
      throw error;
    }

    return data || [];
  },

  // Get all payment plans (including inactive)
  async getAllPaymentPlans(): Promise<PaymentPlan[]> {
    const { data, error } = await supabase
      .from("payment_plans")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching all payment plans:", error);
      throw error;
    }

    return data || [];
  },

  // Create payment plan
  async createPaymentPlan(plan: PaymentPlanInsert): Promise<PaymentPlan> {
    const { data, error } = await supabase
      .from("payment_plans")
      .insert(plan)
      .select()
      .single();

    if (error) {
      console.error("Error creating payment plan:", error);
      throw error;
    }

    return data;
  },

  // Update payment plan
  async updatePaymentPlan(id: string, updates: PaymentPlanUpdate): Promise<PaymentPlan> {
    const { data, error } = await supabase
      .from("payment_plans")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating payment plan:", error);
      throw error;
    }

    return data;
  },

  // Delete payment plan (soft delete by setting is_active to false)
  async deletePaymentPlan(id: string): Promise<void> {
    const { error } = await supabase
      .from("payment_plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting payment plan:", error);
      throw error;
    }
  },

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }

    return data?.value || null;
  },

  async getAllSettings(): Promise<Setting[]> {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) {
      console.error("Error fetching settings:", error);
      throw error;
    }

    return data || [];
  },

  async updateSetting(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  },

  async createSetting(setting: SettingInsert): Promise<Setting> {
    const { data, error } = await supabase
      .from("settings")
      .insert(setting)
      .select()
      .single();

    if (error) {
      console.error("Error creating setting:", error);
      throw error;
    }

    return data;
  }
};
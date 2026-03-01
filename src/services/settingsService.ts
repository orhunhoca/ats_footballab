import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type PaymentPlan = Tables<"payment_plans">;
export type PaymentPlanInsert = Database["public"]["Tables"]["payment_plans"]["Insert"];
export type PaymentPlanUpdate = Database["public"]["Tables"]["payment_plans"]["Update"];

export type Setting = Tables<"settings">;
export type SettingInsert = Database["public"]["Tables"]["settings"]["Insert"];
export type SettingUpdate = Database["public"]["Tables"]["settings"]["Update"];

export type TestProtocol = Tables<"test_protocols">;
export type TestProtocolInsert = Database["public"]["Tables"]["test_protocols"]["Insert"];
export type TestProtocolUpdate = Database["public"]["Tables"]["test_protocols"]["Update"];

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
    console.log("Creating payment plan with data:", plan);
    
    const { data, error } = await supabase
      .from("payment_plans")
      .insert(plan)
      .select()
      .single();

    if (error) {
      console.error("Error creating payment plan:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Ödeme planı oluşturulamadı: ${error.message}`);
    }

    console.log("Payment plan created successfully:", data);
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

  // Test Protocols
  async getTestProtocols(): Promise<TestProtocol[]> {
    const { data, error } = await supabase
      .from("test_protocols")
      .select("*")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching test protocols:", error);
      throw error;
    }

    return data || [];
  },

  async getAllTestProtocols(): Promise<TestProtocol[]> {
    const { data, error } = await supabase
      .from("test_protocols")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching all test protocols:", error);
      throw error;
    }

    return data || [];
  },

  async createTestProtocol(protocol: TestProtocolInsert): Promise<TestProtocol> {
    const { data, error } = await supabase
      .from("test_protocols")
      .insert(protocol)
      .select()
      .single();

    if (error) {
      console.error("Error creating test protocol:", error);
      throw error;
    }

    return data;
  },

  async updateTestProtocol(id: string, updates: TestProtocolUpdate): Promise<TestProtocol> {
    const { data, error } = await supabase
      .from("test_protocols")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating test protocol:", error);
      throw error;
    }

    return data;
  },

  async deleteTestProtocol(id: string): Promise<void> {
    const { error } = await supabase
      .from("test_protocols")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error deleting test protocol:", error);
      throw error;
    }
  },

  // Get all schools
  async getSchools() {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching schools:", error);
      throw error;
    }

    return data || [];
  },

  // Add new school
  async addSchool(name: string) {
    const { data, error } = await supabase
      .from("schools")
      .insert({ name })
      .select()
      .single();

    if (error) {
      console.error("Error adding school:", error);
      throw error;
    }

    return data;
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
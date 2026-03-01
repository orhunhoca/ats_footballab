import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

// We are transitioning from "users" table to "profiles" table + Supabase Auth
// Keeping these types for legacy support until full migration
export type User = Tables<"users">;
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

export const userService = {
  /**
   * Login user - DEPRECATED: Use authService.signIn instead
   */
  async login(username: string, password: string) {
    console.warn("userService.login is deprecated. Use authService.signIn instead.");
    return null;
  },

  /**
   * Logout - DEPRECATED: Use authService.signOut instead
   */
  logout(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("currentUser");
  },

  /**
   * Get current user - DEPRECATED: Use authService.getCurrentUser instead
   */
  getCurrentUser() {
    if (typeof window === "undefined") return null;
    return null;
  },

  /**
   * Check if user is admin
   */
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
      
    return data?.role === "admin";
  },

  /**
   * Get all users (from profiles)
   */
  async getUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  /**
   * Create new user - Should be done via Auth API
   * For now, we'll just return a placeholder error
   */
  async createUser(user: any) {
    throw new Error("Kullanıcı oluşturma işlemi için Yönetim panelini kullanın.");
  },

  /**
   * Update user profile
   */
  async updateUser(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    // Soft delete not supported on profiles directly without cascade
    // For now we just console log
    console.warn("Deleting users requires Supabase Admin API");
  },
};
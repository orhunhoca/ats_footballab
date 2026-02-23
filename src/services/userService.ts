import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

/**
 * Simple password hashing function (for demo purposes)
 * In production, use a proper library like bcrypt
 */
function hashPassword(password: string): string {
  // Simple hash - in production use bcrypt or similar
  return btoa(password);
}

/**
 * Verify password against hash
 */
function verifyPassword(password: string, hash: string): boolean {
  return btoa(password) === hash;
}

export const userService = {
  /**
   * Login user with username and password
   */
  async login(username: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (!data) {
        return null;
      }

      // Verify password
      if (!verifyPassword(password, data.password)) {
        return null;
      }

      // Store user session in localStorage
      localStorage.setItem("currentUser", JSON.stringify(data));

      return data;
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  },

  /**
   * Logout current user
   */
  logout(): void {
    localStorage.removeItem("currentUser");
  },

  /**
   * Get current logged in user
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === "admin";
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  /**
   * Create new user
   */
  async createUser(user: Omit<UserInsert, "password"> & { password: string }): Promise<User> {
    try {
      const hashedPassword = hashPassword(user.password);
      
      const { data, error } = await supabase
        .from("users")
        .insert({
          ...user,
          password: hashedPassword,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  /**
   * Update user
   */
  async updateUser(
    id: string,
    updates: Partial<Omit<UserUpdate, "password">> & { password?: string }
  ): Promise<User> {
    try {
      const updateData: Partial<UserUpdate> = { ...updates };
      
      // Hash password if provided
      if (updates.password) {
        updateData.password = hashPassword(updates.password);
      }

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user:", error);
        throw error;
      }

      // Update localStorage if current user
      const currentUser = this.getCurrentUser();
      if (currentUser?.id === id) {
        localStorage.setItem("currentUser", JSON.stringify(data));
      }

      return data;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete user (soft delete - set is_active to false)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", id);

      if (error) {
        console.error("Error deleting user:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
};
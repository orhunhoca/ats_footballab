import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export const authService = {
  /**
   * Create a new staff/coach user without signing in (admin only).
   * Runs server-side in the `admin-create-user` Edge Function so that public
   * sign-ups can stay disabled and roles cannot be chosen by the client.
   */
  async createUserWithoutLogin(
    email: string,
    password: string,
    fullName: string,
    role: string = "coach",
    coach?: Record<string, unknown>
  ) {
    // coach verilirse antrenör kaydı aynı işlemde oluşturulur; başarısız olursa hesap da geri alınır.
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      // "manager": yönetici hesabı; diğer her şey antrenör (sunucuda "user")
      body: { email, password, fullName, coach, role: role === "manager" ? "manager" : "user" },
    });

    if (error) {
      let message = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) message = body.error;
      } catch {
        // response body was not JSON
      }
      console.error("Create user error:", message);
      throw new Error(message);
    }

    if (!data?.success) {
      throw new Error(data?.error || "Kullanıcı oluşturulamadı");
    }

    return {
      user: data.user as { id: string; email: string },
      coach: (data.coach ?? null) as Record<string, unknown> | null,
    };
  },

  /**
   * Sign up a new user with Supabase Auth
   */
  async signUp(email: string, password: string, fullName: string, role: string = "user") {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          },
          emailRedirectTo: undefined
        }
      });

      if (authError) {
        console.error("Signup error:", authError);
        throw authError;
      }

      console.log("User signed up successfully:", authData);
      return authData;
    } catch (error) {
      console.error("Error in signUp:", error);
      throw error;
    }
  },

  /**
   * Sign in with email and password using Supabase Auth
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      console.log("User signed in successfully:", { user: data.user, profile });
      return { user: data.user, profile };
    } catch (error) {
      console.error("Error in signIn:", error);
      throw error;
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Signout error:", error);
        throw error;
      }
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error in signOut:", error);
      throw error;
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Get session error:", error);
        throw error;
      }
      return session;
    } catch (error) {
      console.error("Error in getSession:", error);
      throw error;
    }
  },

  /**
   * Get the session only if the server still accepts it.
   * A session stored in the browser can outlive its user (e.g. the user was
   * deleted). In that case the local session is cleared and null is returned.
   */
  async getValidSession() {
    const session = await this.getSession();
    if (!session) return null;

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      console.warn("Stored session is no longer valid, signing out locally:", error?.message);
      await supabase.auth.signOut({ scope: "local" });
      return null;
    }

    return session;
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<Profile | null> {
    try {
      const session = await this.getSession();
      if (!session?.user) {
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching current user:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      console.log("Profile updated successfully:", data);
      return data;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw error;
    }
  },

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Error updating password:", error);
        throw error;
      }

      console.log("Password updated successfully");
      return data;
    } catch (error) {
      console.error("Error in updatePassword:", error);
      throw error;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings?tab=security`, // Yönlendirilecek sayfa
      });

      if (error) {
        console.error("Error sending reset email:", error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Error in sendPasswordResetEmail:", error);
      throw error;
    }
  },

  /**
   * Check if user is admin
   */
  async isAdmin(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user?.role === "admin";
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  },

  // Create user profile with role
  async createProfile(userId: string, profileData: { email: string; full_name: string; role: string }) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: profileData.email,
        full_name: profileData.full_name,
        role: profileData.role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    return { data, error };
  }
};
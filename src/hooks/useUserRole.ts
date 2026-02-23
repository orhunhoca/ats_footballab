import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "coach" | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        setRole((profile?.role as UserRole) || "coach");
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("coach"); // Default to coach on error
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  return { role, loading, isAdmin: role === "admin" };
}
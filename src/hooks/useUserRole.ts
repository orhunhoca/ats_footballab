import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * admin   : her şeyi girer/yönetir (şube, antrenör, şablon, ayar) ve yönetici atar
 * manager : yönetici — tüm şubelerin öğrenci/yoklama/ödeme/rapor verilerine ulaşır
 * coach   : antrenör — yalnızca kendi şubesinin öğrenci bilgisi (salt okunur), yoklama,
 *           performans testleri ve raporları
 * Veritabanında antrenör rolü "user" olarak saklanır.
 */
export type UserRole = "admin" | "manager" | "coach" | null;

export function roleFromProfile(dbRole: string | null | undefined): UserRole {
  if (dbRole === "admin") return "admin";
  if (dbRole === "manager") return "manager";
  if (dbRole === "user") return "coach";
  return null; // pending veya bilinmeyen: hiçbir yetki yok
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!cancelled) setRole(roleFromProfile(profile?.role));
      } catch (error) {
        console.error("Error fetching role:", error);
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = role === "admin";
  /** admin + yönetici: tüm şubeler, ödemeler, iletişim */
  const isManagement = role === "admin" || role === "manager";
  const isCoach = role === "coach";

  return { role, loading, isAdmin, isManager: role === "manager", isManagement, isCoach };
}

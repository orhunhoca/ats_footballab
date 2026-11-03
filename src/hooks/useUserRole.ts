import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * admin   : her şeyi girer/yönetir (şube, antrenör, şablon, ayar) ve yönetici atar
 * manager : yönetici — tüm şubelerin öğrenci/yoklama/ödeme/rapor verilerine ulaşır
 * coach   : antrenör — yalnızca kendi şubesinin öğrenci bilgisi (salt okunur), yoklama,
 *           performans testleri ve raporları
 * parent  : veli — yalnızca kendi portalı (/portal); personel ekranlarına erişemez
 * Veritabanında antrenör rolü "user" olarak saklanır.
 */
export type UserRole = "admin" | "manager" | "coach" | "parent" | null;

export function roleFromProfile(dbRole: string | null | undefined): UserRole {
  if (dbRole === "admin") return "admin";
  if (dbRole === "manager") return "manager";
  if (dbRole === "user") return "coach";
  if (dbRole === "parent") return "parent";
  return null; // pending veya bilinmeyen: hiçbir yetki yok
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [coachBranchId, setCoachBranchId] = useState<string | null>(null);
  const [coachBranchAccess, setCoachBranchAccess] = useState<"own" | "all" | null>(null);
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

        const resolved = roleFromProfile(profile?.role);
        if (!cancelled) setRole(resolved);

        // Antrenörün şubesi ve şube yetkisi ("own" yalnızca kendi şubesi, "all" tüm şubeler)
        if (resolved === "coach") {
          const { data: coach } = await supabase
            .from("coaches")
            .select("branch_id, branch_access")
            .eq("user_id", user.id)
            .eq("status", "Aktif")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (!cancelled) {
            setCoachBranchId(coach?.branch_id ?? null);
            setCoachBranchAccess(coach?.branch_access === "all" ? "all" : "own");
          }
        }
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
  const isParent = role === "parent";

  /** Admin/yönetici veya "tüm şubeler" yetkili antrenör: şube seçebilir */
  const canSeeAllBranches = isManagement || (isCoach && coachBranchAccess === "all");

  return {
    role,
    loading,
    isAdmin,
    isManager: role === "manager",
    isManagement,
    isCoach,
    isParent,
    coachBranchId,
    coachBranchAccess,
    canSeeAllBranches,
  };
}

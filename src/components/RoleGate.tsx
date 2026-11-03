import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

export type RoleLevel = "admin" | "management" | "staff" | "parent";

/**
 * Sayfayı role göre korur.
 *  - admin:      yalnızca admin
 *  - management: admin + yönetici
 *  - staff:      admin + yönetici + antrenör (veli HARİÇ)
 *  - parent:     yalnızca veli (/portal)
 * Yetkisi olmayan kullanıcı ana sayfaya yönlendirilir. (Asıl güvenlik veritabanı
 * kurallarındadır; bu yalnızca kullanıcıyı boş/hatalı ekranlardan korur.)
 */
export function RoleGate({ level, children }: { level: RoleLevel; children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { loading, isAdmin, isManagement, isCoach, isParent } = useUserRole();

  const allowed =
    level === "admin" ? isAdmin : level === "management" ? isManagement : level === "parent" ? isParent : isManagement || isCoach;

  useEffect(() => {
    if (!loading && !allowed) {
      toast({
        title: "Yetkiniz yok",
        description: "Bu sayfaya erişim yetkiniz bulunmuyor.",
        variant: "destructive",
      });
      // Veli personel sayfalarına girmeye çalışırsa kendi portalına, diğerleri ana sayfaya
      router.replace(isParent ? "/portal" : "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allowed]);

  if (loading || !allowed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return <>{children}</>;
}

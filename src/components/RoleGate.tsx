import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

export type RoleLevel = "admin" | "management" | "staff";

/**
 * Sayfayı role göre korur.
 *  - admin:      yalnızca admin
 *  - management: admin + yönetici
 *  - staff:      admin + yönetici + antrenör
 * Yetkisi olmayan kullanıcı ana sayfaya yönlendirilir. (Asıl güvenlik veritabanı
 * kurallarındadır; bu yalnızca kullanıcıyı boş/hatalı ekranlardan korur.)
 */
export function RoleGate({ level, children }: { level: RoleLevel; children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { loading, isAdmin, isManagement, role } = useUserRole();

  const allowed = level === "admin" ? isAdmin : level === "management" ? isManagement : role !== null;

  useEffect(() => {
    if (!loading && !allowed) {
      toast({
        title: "Yetkiniz yok",
        description: "Bu sayfaya erişim yetkiniz bulunmuyor.",
        variant: "destructive",
      });
      router.replace("/");
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

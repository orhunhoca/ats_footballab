import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Kayıt formlarında şube seçimi:
 *  - Yönetim ve "tüm şubeler" yetkili antrenör: şubeyi seçebilir (varsayılan = seçili şube)
 *  - Yalnızca kendi şubesi yetkili antrenör: kendi şubesine kilitli
 */
export function useBranchPermission() {
  const { defaultBranchId } = useBranch();
  const { isCoach, coachBranchId, coachBranchAccess } = useUserRole();

  const locked = isCoach && coachBranchAccess !== "all";
  const formDefaultBranchId = locked
    ? coachBranchId ?? ""
    : defaultBranchId || (isCoach ? coachBranchId ?? "" : "");

  return { locked, formDefaultBranchId };
}

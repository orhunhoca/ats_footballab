import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Sayfa başında şube filtresi: Tümü + eklenen her aktif şube (otomatik).
 * Seçim üst menüdeki şube seçiciyle ortaktır (BranchContext) ve tüm sayfaları süzer.
 * Yalnızca birden fazla şubeye erişimi olan kullanıcılar (admin, yönetici, "tüm şubeler"
 * yetkili antrenör) görür; tek şube varsa sadece şube adı bilgi olarak gösterilir.
 */
export function BranchFilterBar() {
  const { activeBranches, selectedBranchId, setSelectedBranchId } = useBranch();
  const { canSeeAllBranches } = useUserRole();

  if (!canSeeAllBranches || activeBranches.length === 0) return null;

  if (activeBranches.length === 1) {
    return (
      <div className="mb-4 sm:mb-6 flex items-center gap-2 text-sm text-gray-600">
        <Building2 className="h-4 w-4 text-emerald-600" />
        Şube: <strong>{activeBranches[0].name}</strong>
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-6 flex items-center gap-2" role="group" aria-label="Şube filtresi">
      <span className="flex shrink-0 items-center gap-1.5 text-sm text-gray-600">
        <Building2 className="h-4 w-4 text-emerald-600" />
        Şube:
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={selectedBranchId === null ? "default" : "outline"}
          className={selectedBranchId === null ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          onClick={() => setSelectedBranchId(null)}
        >
          Tüm Şubeler
        </Button>
        {activeBranches.map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant={selectedBranchId === b.id ? "default" : "outline"}
            className={`shrink-0 ${selectedBranchId === b.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            onClick={() => setSelectedBranchId(b.id)}
          >
            {b.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

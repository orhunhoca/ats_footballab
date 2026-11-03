import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const ALL = "__all__";

/**
 * Üst menüde aktif şubeyi seçtirir. Tek şube varsa veya kullanıcı yalnızca kendi şubesini
 * görebilen bir antrenörse gösterilmez.
 */
export function BranchSwitcher({ className }: { className?: string }) {
  const { activeBranches, selectedBranchId, setSelectedBranchId } = useBranch();
  const { canSeeAllBranches } = useUserRole();

  if (!canSeeAllBranches || activeBranches.length < 2) return null;

  return (
    <Select
      value={selectedBranchId ?? ALL}
      onValueChange={(v) => setSelectedBranchId(v === ALL ? null : v)}
    >
      <SelectTrigger className={cn("h-9 w-[170px] gap-2", className)} aria-label="Şube seç">
        <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Tüm Şubeler</SelectItem>
        {activeBranches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

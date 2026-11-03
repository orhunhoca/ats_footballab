import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "@/contexts/BranchContext";

interface BranchSelectProps {
  value: string;
  onChange: (branchId: string) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

/**
 * Formlarda şube seçimi (zorunlu). Yalnızca aktif şubeler listelenir;
 * kaydın mevcut şubesi pasifse düzenlerken yine de görünür.
 */
export function BranchSelect({ value, onChange, disabled, label = "Şube *", id = "branch" }: BranchSelectProps) {
  const { branches, activeBranches } = useBranch();
  const options = branches.filter((b) => b.is_active || b.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || activeBranches.length === 0}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={activeBranches.length === 0 ? "Önce bir şube ekleyin" : "Şube seçin"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
              {!b.is_active ? " (pasif)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

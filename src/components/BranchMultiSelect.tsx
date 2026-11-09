import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useBranch } from "@/contexts/BranchContext";

/** Birden fazla şube seçimi (aktif şubeler) + seçilenler arasından ana şube */
export function BranchMultiSelect({
  value,
  onChange,
  primary,
  onPrimaryChange,
  label = "Çalıştığı şubeler *",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  primary: string;
  onPrimaryChange: (id: string) => void;
  label?: string;
}) {
  const { activeBranches } = useBranch();

  const toggle = (id: string, checked: boolean) => {
    const next = checked ? Array.from(new Set([...value, id])) : value.filter((v) => v !== id);
    onChange(next);
    if (next.length > 0 && !next.includes(primary)) onPrimaryChange(next[0]);
    if (next.length === 0) onPrimaryChange("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1.5 rounded-md border p-3">
        {activeBranches.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={value.includes(b.id)} onCheckedChange={(c) => toggle(b.id, c === true)} />
              <span className="truncate">{b.name}</span>
            </label>
            {value.includes(b.id) &&
              (primary === b.id ? (
                <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Ana şube</span>
              ) : (
                <button type="button" className="shrink-0 text-[11px] text-blue-600 hover:underline" onClick={() => onPrimaryChange(b.id)}>
                  Ana şube yap
                </button>
              ))}
          </div>
        ))}
        {activeBranches.length === 0 && <p className="text-xs text-muted-foreground">Aktif şube yok.</p>}
      </div>
      <p className="text-xs text-muted-foreground">Antrenör işaretlediğiniz tüm şubelerde çalışabilir; ana şubesi öncelikli şubesidir.</p>
    </div>
  );
}

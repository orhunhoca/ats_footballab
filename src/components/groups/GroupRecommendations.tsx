import { AlertTriangle, CheckCircle2, Clock, LayoutGrid, Sparkles, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { recommendGroups } from "@/lib/groupRecommendation";
import { formatSession, remaining, sortSessions, type Occupancy, type Session } from "@/lib/groupRules";
import { formatFieldHours, type BranchField } from "@/services/fieldService";
import type { DirectoryGroup } from "@/hooks/useGroupDirectory";

interface Props {
  birthDate: string;
  branchId: string;
  groups: DirectoryGroup[];
  occupancy: Record<string, Occupancy>;
  sessions: Record<string, Session[]>;
  fields: Record<string, BranchField>;
  selectedId: string;
  onSelect: (groupId: string) => void;
}

/** Doğum yılına göre önerilen gruplar: kontenjanı olan, yaşı uyan gruplar (en uygunu önde); dolu olanlar ayrı gösterilir */
export function GroupRecommendations({ birthDate, branchId, groups, occupancy, sessions, fields, selectedId, onSelect }: Props) {
  if (!birthDate) return null;
  const year = new Date(birthDate).getFullYear();
  const rec = recommendGroups(birthDate, branchId, groups, occupancy);

  const card = (g: DirectoryGroup, best: boolean, disabled: boolean) => {
    const left = remaining(occupancy[g.id]);
    const sel = selectedId === g.id;
    const list = sessions[g.id]?.length ? sortSessions(sessions[g.id]).map(formatSession) : [];
    const f = g.field_id ? fields[g.field_id] : undefined;
    return (
      <button
        key={g.id}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(g.id)}
        className={`w-full rounded-md border p-3 text-left transition ${sel ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "hover:bg-accent"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{g.name}</span>
          <span className="text-xs text-muted-foreground">{g.age_group}</span>
          {best && !disabled && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <Sparkles className="mr-1 h-3 w-3" />
              En uygun
            </Badge>
          )}
          {disabled ? (
            <Badge variant="destructive">Dolu</Badge>
          ) : left != null ? (
            <Badge variant="outline">{left} yer kaldı</Badge>
          ) : null}
          {sel && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-700" />}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {list.length > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {list.join(" · ")}
            </span>
          )}
          {f && (
            <span className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" /> {f.name} ({formatFieldHours(f)})
            </span>
          )}
          {g.coaches && (
            <span className="flex items-center gap-1">
              <UserCircle className="h-3 w-3" /> {g.coaches.name}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-2 rounded-md border bg-slate-50 p-3">
      <p className="text-sm font-medium">
        {year} doğumlu için önerilen gruplar <span className="font-normal text-muted-foreground">(doğum yılına ve boş kontenjana göre)</span>
      </p>

      {rec.noneDefined && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Bu şubede {year} doğumlu çocuklar için tanımlı aktif grup yok. Grup Yönetimi'nden bu doğum yılını kapsayan bir grup açın; o zamana kadar listeden elle bir grup seçebilirsiniz.
          </AlertDescription>
        </Alert>
      )}

      {!rec.noneDefined && rec.available.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {year} doğumlu çocuklar için uygun grupların kontenjanı dolu. Başka bir sahada/saatte yeni grup açın ya da mevcut grubun kontenjanını artırın.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {rec.available.map((g, i) => card(g, i === 0, false))}
        {rec.full.map((g) => card(g, false, true))}
      </div>
    </div>
  );
}

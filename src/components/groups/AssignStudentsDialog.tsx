import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Search, UserPlus } from "lucide-react";
import { studentService, type Student } from "@/services/studentService";
import { useToast } from "@/hooks/use-toast";
import { ageOf, capacityErrorMessage, isAgeEligible, remaining, type Occupancy } from "@/lib/groupRules";
import type { Tables } from "@/integrations/supabase/types";

type Group = Tables<"groups">;
type StudentWithGroups = Student & { student_groups?: { group_id: string; groups?: { id: string; name: string } | null }[] | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  occupancy?: Occupancy;
  onChanged: () => void;
}

/** Gruba öğrenci atama: grubun şubesindeki aktif öğrenciler; yaşı uyanlar önce; kalan kontenjan kadar seçilebilir */
export function AssignStudentsDialog({ open, onOpenChange, group, occupancy, onChanged }: Props) {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentWithGroups[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !group) return;
    setSelected(new Set());
    setSearch("");
    setShowAll(false);
    setLoading(true);
    studentService
      .getAllStudents(group.branch_id)
      .then((list) => setStudents(list as StudentWithGroups[]))
      .catch(() => toast({ title: "Hata", description: "Öğrenciler yüklenemedi.", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);

  const left = remaining(occupancy); // null: sınırsız

  const candidates = useMemo(() => {
    if (!group) return [];
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => s.status === "Aktif")
      .filter((s) => !(s.student_groups ?? []).some((sg) => sg.group_id === group.id))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((s) => ({ s, eligible: isAgeEligible(group, s) }))
      .filter((x) => showAll || x.eligible)
      .sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.s.name.localeCompare(b.s.name, "tr"));
  }, [students, group, search, showAll]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (left != null && next.size >= left) return prev;
        next.add(id);
      } else next.delete(id);
      return next;
    });
  };

  const assign = async () => {
    if (!group || selected.size === 0) return;
    setSaving(true);
    let ok = 0;
    let failure: string | null = null;
    for (const id of selected) {
      try {
        const st = students.find((s) => s.id === id);
        // Öğrenci tek grupta: başka bir gruptaysa oradan taşınır
        for (const sg of st?.student_groups ?? []) {
          if (sg.group_id !== group.id) await studentService.removeFromGroup(id, sg.group_id);
        }
        await studentService.assignToGroup(id, group.id);
        ok++;
      } catch (e) {
        failure = capacityErrorMessage(e) ?? (e instanceof Error ? e.message : "Atama yapılamadı.");
        break;
      }
    }
    setSaving(false);
    toast({
      title: failure ? "Atama tamamlanamadı" : "Öğrenciler atandı",
      description: failure ? `${ok} öğrenci eklendi. ${failure}` : `${ok} öğrenci ${group.name} grubuna eklendi.`,
      variant: failure ? "destructive" : "default",
    });
    onChanged();
    if (!failure) onOpenChange(false);
    else setSelected(new Set());
  };

  const eligibleLabel = group
    ? group.age_min != null || group.age_max != null
      ? `${group.age_min ?? "?"}–${group.age_max ?? "?"} yaş`
      : group.age_group
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            {group?.name} — Öğrenci Ata
          </DialogTitle>
          <DialogDescription>
            Yaşı {eligibleLabel} aralığına uyan öğrenciler listelenir.{" "}
            {left == null ? "Kontenjan sınırı yok." : `Kalan kontenjan: ${left}.`}
          </DialogDescription>
        </DialogHeader>

        {left === 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Bu grubun kontenjanı dolu. Öğrenci eklemek için kontenjanı artırın (Düzenle) ya da başka bir gruba atayın.</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Öğrenci ara" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={showAll} onCheckedChange={(c) => setShowAll(c === true)} />
            Yaşı uymayanlar da
          </label>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Uygun öğrenci bulunamadı.</p>
          ) : (
            candidates.map(({ s, eligible }) => {
              const current = (s.student_groups ?? []).map((sg) => sg.groups?.name).filter(Boolean).join(", ");
              const isSel = selected.has(s.id);
              const blocked = !isSel && left != null && selected.size >= left;
              return (
                <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-md border p-2.5 ${blocked ? "opacity-50" : ""}`}>
                  <Checkbox checked={isSel} disabled={blocked || left === 0} onCheckedChange={(c) => toggle(s.id, c === true)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ageOf(s) != null ? `${ageOf(s)} yaş` : "yaş bilinmiyor"}
                      {current ? ` · şu an: ${current}` : " · grupsuz"}
                    </span>
                  </span>
                  {!eligible && <Badge variant="outline">Yaş uymuyor</Badge>}
                </label>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Kapat
          </Button>
          <Button onClick={assign} disabled={saving || selected.size === 0} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selected.size > 0 ? `${selected.size} öğrenciyi ata` : "Ata"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DRILL_AGE_RANGE, DRILLS, KIND_LABELS, type DrillKind } from "@/lib/training/drills";
import { AGES, getAgeProfile, renderDrill } from "@/lib/training/curriculum";
import { trainingLibraryService, type CustomDrill } from "@/services/trainingLibraryService";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { DrillForm } from "./DrillForm";
import { DrillView, type DrillLike } from "./DrillView";

interface Item {
  key: string;
  drill: DrillLike;
  kind: DrillKind;
  minAge: number;
  maxAge: number;
  minutes?: number | null;
  custom?: CustomDrill;
}

const ALL = "all";

/** Egzersiz kütüphanesi: hazır egzersizler + hocaların eklediği çalışmalar. */
export function DrillLibrary() {
  const { toast } = useToast();
  const { isManagement } = useUserRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [custom, setCustom] = useState<CustomDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<string>(ALL);
  const [age, setAge] = useState<string>("10");
  const [selected, setSelected] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomDrill | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError("");
      setCustom(await trainingLibraryService.list());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Kütüphane yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [load]);

  const profile = getAgeProfile(Number(age));

  const items: Item[] = useMemo(() => {
    const builtIn: Item[] = Object.values(DRILLS).map((d) => {
      const [minAge, maxAge] = DRILL_AGE_RANGE[d.id] ?? [6, 16];
      return { key: d.id, drill: renderDrill(d.id, profile), kind: d.kind, minAge, maxAge };
    });
    const added: Item[] = custom.map((c) => ({
      key: c.id,
      drill: { name: c.name, kind: c.kind, goal: c.goal, setup: c.setup, how: c.how, points: c.points, easier: c.easier, harder: c.harder, materials: c.materials, players: c.players },
      kind: c.kind as DrillKind,
      minAge: c.min_age,
      maxAge: c.max_age,
      minutes: c.suggested_minutes,
      custom: c,
    }));
    return [...added, ...builtIn];
  }, [custom, profile]);

  const a = Number(age);
  const visible = items.filter(
    (i) =>
      a >= i.minAge &&
      a <= i.maxAge &&
      (kind === ALL || i.kind === kind) &&
      (search.trim() === "" || i.drill.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const canEdit = (c?: CustomDrill) => !!c && (isManagement || c.created_by === userId);

  const remove = async (c: CustomDrill) => {
    if (!window.confirm(`"${c.name}" egzersizi kütüphaneden silinsin mi?`)) return;
    try {
      await trainingLibraryService.remove(c.id);
      setSelected(null);
      await load();
      toast({ title: "Egzersiz silindi" });
    } catch (e) {
      toast({ title: "Silinemedi", description: e instanceof Error ? e.message : "Bir hata oluştu.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Egzersiz ara…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={age} onValueChange={(v) => v && setAge(v)}>
          <SelectTrigger className="w-full sm:w-32" aria-label="Yaş">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGES.map((x) => (
              <SelectItem key={x} value={String(x)}>
                {x} yaş
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(v) => v && setKind(v)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Tür">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tüm türler</SelectItem>
            {(Object.keys(KIND_LABELS) as DrillKind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Egzersiz Ekle
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Hazır egzersizlerin alan, top ve mesafe değerleri seçilen yaşa göre uyarlanır. Hocaların eklediği egzersizler "Hoca" etiketiyle görünür.
      </p>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>Hocaların eklediği egzersizler yüklenemedi: {loadError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">Bu filtrelerle egzersiz bulunamadı.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => setSelected(i)}
              className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="mb-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{KIND_LABELS[i.kind]}</Badge>
                {i.custom && (
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    <User className="mr-1 h-3 w-3" />
                    Hoca{i.custom.created_by_name ? `: ${i.custom.created_by_name}` : ""}
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-gray-900">{i.drill.name}</p>
              {i.drill.goal && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{i.drill.goal}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {i.minAge}–{i.maxAge} yaş{i.minutes ? ` · önerilen ${i.minutes} dk` : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selected.drill.name}</DialogTitle>
                <DialogDescription>
                  {selected.minAge}–{selected.maxAge} yaş{selected.minutes ? ` · önerilen ${selected.minutes} dk` : ""}
                  {selected.custom?.created_by_name ? ` · ekleyen: ${selected.custom.created_by_name}` : ""}
                </DialogDescription>
              </DialogHeader>
              <DrillView drill={selected.drill} />
              {canEdit(selected.custom) && selected.custom && (
                <div className="flex gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(selected.custom!);
                      setSelected(null);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Düzenle
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(selected.custom!)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Sil
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <DrillForm open={formOpen} onOpenChange={setFormOpen} drill={editing} onSaved={load} />
    </div>
  );
}

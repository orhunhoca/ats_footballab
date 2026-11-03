import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KIND_LABELS, type DrillKind } from "@/lib/training/drills";
import { AGES } from "@/lib/training/curriculum";
import { trainingLibraryService, type CustomDrill, type CustomDrillInput } from "@/services/trainingLibraryService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill?: CustomDrill | null;
  onSaved: () => void;
}

const EMPTY = {
  name: "",
  kind: "technical" as DrillKind,
  min_age: "6",
  max_age: "16",
  minutes: "",
  players: "",
  goal: "",
  setup: "",
  how: "",
  points: "",
  easier: "",
  harder: "",
  materials: "",
};

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

/** Hocaların kütüphaneye egzersiz eklediği / kendi eklediğini düzenlediği form. */
export function DrillForm({ open, onOpenChange, drill, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      drill
        ? {
            name: drill.name,
            kind: (drill.kind as DrillKind) || "technical",
            min_age: String(drill.min_age),
            max_age: String(drill.max_age),
            minutes: drill.suggested_minutes ? String(drill.suggested_minutes) : "",
            players: drill.players || "",
            goal: drill.goal || "",
            setup: drill.setup || "",
            how: drill.how.join("\n"),
            points: drill.points.join("\n"),
            easier: drill.easier || "",
            harder: drill.harder || "",
            materials: drill.materials.join("\n"),
          }
        : EMPTY,
    );
  }, [open, drill]);

  const set = (patch: Partial<typeof EMPTY>) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = Number(form.min_age);
    const max = Number(form.max_age);
    if (form.name.trim().length < 2) return toast({ title: "Eksik bilgi", description: "Egzersiz adını yazın.", variant: "destructive" });
    if (max < min) return toast({ title: "Yaş aralığı hatalı", description: "En büyük yaş, en küçük yaştan küçük olamaz.", variant: "destructive" });
    if (lines(form.how).length === 0) return toast({ title: "Eksik bilgi", description: "Nasıl oynandığını en az bir satır olarak yazın.", variant: "destructive" });

    const input: CustomDrillInput = {
      name: form.name.trim(),
      kind: form.kind,
      min_age: min,
      max_age: max,
      suggested_minutes: form.minutes ? Math.min(120, Math.max(1, Number(form.minutes))) : null,
      players: form.players.trim() || null,
      goal: form.goal.trim() || null,
      setup: form.setup.trim() || null,
      how: lines(form.how),
      points: lines(form.points),
      easier: form.easier.trim() || null,
      harder: form.harder.trim() || null,
      materials: lines(form.materials),
    };
    setSaving(true);
    try {
      if (drill) await trainingLibraryService.update(drill.id, input);
      else await trainingLibraryService.create(input);
      toast({ title: drill ? "Egzersiz güncellendi" : "Egzersiz kütüphaneye eklendi" });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Kaydedilemedi", description: error instanceof Error ? error.message : "Bir hata oluştu.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{drill ? "Egzersizi Düzenle" : "Kütüphaneye Egzersiz Ekle"}</DialogTitle>
          <DialogDescription>Eklediğiniz egzersizi tüm antrenörler kütüphanede görür. Satır satır yazabilirsiniz.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="d-name">Egzersiz adı *</Label>
            <Input id="d-name" value={form.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Türü</Label>
              <Select value={form.kind} onValueChange={(v) => v && set({ kind: v as DrillKind })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABELS) as DrillKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>En küçük yaş</Label>
              <Select value={form.min_age} onValueChange={(v) => v && set({ min_age: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGES.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>En büyük yaş</Label>
              <Select value={form.max_age} onValueChange={(v) => v && set({ max_age: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGES.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="d-players">Kaç kişilik</Label>
              <Input id="d-players" placeholder="Örn: 4–6'şar kişilik gruplar" value={form.players} onChange={(e) => set({ players: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-min">Önerilen süre (dk)</Label>
              <Input id="d-min" type="number" min={1} max={120} value={form.minutes} onChange={(e) => set({ minutes: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-goal">Amaç</Label>
            <Input id="d-goal" value={form.goal} onChange={(e) => set({ goal: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-setup">Alan ve düzen</Label>
            <Textarea id="d-setup" rows={2} placeholder="Örn: 20x20 m alan, 4 köşede huni" value={form.setup} onChange={(e) => set({ setup: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-how">Nasıl oynanır * (her satır bir adım)</Label>
            <Textarea id="d-how" rows={4} value={form.how} onChange={(e) => set({ how: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-points">Antrenör ipuçları (her satır bir madde)</Label>
            <Textarea id="d-points" rows={3} value={form.points} onChange={(e) => set({ points: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="d-easier">Kolaylaştırma</Label>
              <Textarea id="d-easier" rows={2} value={form.easier} onChange={(e) => set({ easier: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-harder">Zorlaştırma</Label>
              <Textarea id="d-harder" rows={2} value={form.harder} onChange={(e) => set({ harder: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-mat">Malzemeler (her satır bir malzeme)</Label>
            <Textarea id="d-mat" rows={3} placeholder={"10 top\n12 huni"} value={form.materials} onChange={(e) => set({ materials: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {drill ? "Kaydet" : "Kütüphaneye Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

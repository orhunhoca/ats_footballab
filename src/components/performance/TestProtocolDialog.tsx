import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save } from "lucide-react";
import { settingsService, type TestProtocol } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import {
  DIRECTION_LABEL,
  guessMeasureType,
  MEASURE_TYPES,
  measureTypeDef,
  SKILLS,
  type MeasureType,
} from "@/lib/testCatalog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Düzenleme için mevcut test; yoksa yeni test */
  protocol?: TestProtocol | null;
  onSaved: (protocol: TestProtocol) => void;
}

/** Test tanımı: ad, beceri alanı, ölçüm türü, birim, iyi yön, açıklama */
export function TestProtocolDialog({ open, onOpenChange, protocol, onSaved }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("");
  const [measure, setMeasure] = useState<MeasureType | "">("");
  const [unit, setUnit] = useState("");
  const [direction, setDirection] = useState<"lower" | "higher">("higher");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (protocol) {
      const m = (protocol.measure_type as MeasureType | null) ?? guessMeasureType(protocol.unit);
      setName(protocol.name);
      setSkill(protocol.category);
      setMeasure(m);
      setUnit(protocol.unit);
      setDirection((protocol.direction as "lower" | "higher" | null) ?? measureTypeDef(m)?.defaultDirection ?? "higher");
      setDescription(protocol.description ?? "");
    } else {
      setName("");
      setSkill("");
      setMeasure("");
      setUnit("");
      setDirection("higher");
      setDescription("");
    }
  }, [open, protocol]);

  // Radix Select seçenekler yüklenmeden "" bildirebilir; boş değeri yok say
  const pickMeasure = (v: string) => {
    if (!v) return;
    const def = measureTypeDef(v);
    if (!def) return;
    setMeasure(def.value);
    if (!def.units.includes(unit)) setUnit(def.units[0]);
    if (!protocol) setDirection(def.defaultDirection);
  };

  const units = measureTypeDef(measure)?.units ?? [];
  const valid = name.trim().length >= 2 && !!skill && !!measure && !!unit;

  const save = async () => {
    if (!valid || !measure) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: skill,
        unit,
        measure_type: measure,
        direction,
        description: description.trim() || null,
      };
      const saved = protocol
        ? await settingsService.updateTestProtocol(protocol.id, payload)
        : await settingsService.createTestProtocol({ ...payload, is_active: true });
      toast({ title: protocol ? "Test güncellendi" : "Test eklendi", description: saved.name });
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      toast({
        title: "Kaydedilemedi",
        description:
          code === "23505"
            ? "Bu isimde bir test zaten var. Farklı bir ad verin (örn. “20m Sprint (rüzgarlı)”)."
            : code === "42501"
              ? "Bu testi düzenleme yetkiniz yok (yalnızca kendi eklediğiniz testleri düzenleyebilirsiniz)."
              : "Test kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{protocol ? "Testi Düzenle" : "Yeni Test Tanımla"}</DialogTitle>
          <DialogDescription>
            Testin neyi ölçtüğünü ve nasıl değerlendirileceğini belirleyin. Sonuçlar bu tanıma göre analiz edilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tp-name">Testin adı *</Label>
            <Input id="tp-name" value={name} maxLength={60} placeholder="örn. Top Sürme Slalomu" onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Hangi beceriyi ölçüyor? *</Label>
            <Select value={skill} onValueChange={(v) => v && setSkill(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Beceri alanı seçin" />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {skill && <p className="text-xs text-muted-foreground">{SKILLS.find((s) => s.value === skill)?.hint}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ne ölçülüyor? *</Label>
              <Select value={measure} onValueChange={pickMeasure}>
                <SelectTrigger>
                  <SelectValue placeholder="Süre, mesafe, tekrar…" />
                </SelectTrigger>
                <SelectContent>
                  {MEASURE_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Birim *</Label>
              <Select value={unit} onValueChange={(v) => v && setUnit(v)} disabled={!measure}>
                <SelectTrigger>
                  <SelectValue placeholder="Birim" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {measure && <p className="-mt-2 text-xs text-muted-foreground">{measureTypeDef(measure)?.hint}</p>}

          <div className="space-y-2">
            <Label>Hangi sonuç daha iyi? *</Label>
            <RadioGroup value={direction} onValueChange={(v) => v && setDirection(v as "lower" | "higher")} className="space-y-2">
              {(["lower", "higher"] as const).map((d) => (
                <label key={d} htmlFor={`dir-${d}`} className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm">
                  <RadioGroupItem id={`dir-${d}`} value={d} className="mt-0.5" />
                  <span>{DIRECTION_LABEL[d]}</span>
                </label>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">Gelişim, grafik ve yaş grubu karşılaştırması bu seçime göre hesaplanır.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tp-desc">Nasıl yapılır? (isteğe bağlı)</Label>
            <Textarea id="tp-desc" rows={3} value={description} maxLength={400} placeholder="Kurulum, mesafe, kurallar…" onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            İptal
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

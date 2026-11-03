import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, RotateCcw, Video } from "lucide-react";
import { performanceService } from "@/services/performanceService";
import type { Student } from "@/services/studentService";
import type { TestProtocol } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { PlankMeter } from "./PlankMeter";
import { JumpMeter } from "./JumpMeter";
import { SprintMeter } from "./SprintMeter";
import type { MeasureResult } from "./measureTypes";

type Kind = "plank" | "sprint" | "jump";
const SPRINT_DISTANCES = [10, 20, 30] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  testProtocols: TestProtocol[];
  onSaved: () => void;
}

export function CameraMeasureDialog({ open, onOpenChange, student, testProtocols, onSaved }: Props) {
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind>("sprint");
  const [distance, setDistance] = useState<number>(20);
  const [result, setResult] = useState<MeasureResult | null>(null);
  const [value, setValue] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState(0); // yeniden ölç → bileşenleri sıfırla

  const protocol = useMemo(() => {
    if (kind === "plank") return testProtocols.find((p) => /plank/i.test(p.name));
    if (kind === "jump") return testProtocols.find((p) => /dikey.*s[ıi]çrama/i.test(p.name));
    return testProtocols.find((p) => new RegExp(`^${distance}\\s?m.*sprint`, "i").test(p.name.trim()));
  }, [kind, distance, testProtocols]);

  const reset = () => {
    setResult(null);
    setValue("");
    setConfirmed(false);
    setSession((s) => s + 1);
  };

  const close = (o: boolean) => {
    if (saving) return;
    if (!o) reset();
    onOpenChange(o);
  };

  const handleResult = (r: MeasureResult) => {
    setResult(r);
    setValue(String(r.value));
    setConfirmed(false);
  };

  const num = Number(String(value).replace(",", "."));
  const valid = Number.isFinite(num) && num > 0;

  const save = async () => {
    if (!result || !protocol || !valid || !confirmed) return;
    setSaving(true);
    try {
      const edited = Math.abs(num - result.value) > 0.001;
      await performanceService.createPerformanceTest({
        student_id: student.id,
        test_protocol_id: protocol.id,
        test_date: new Date().toISOString().slice(0, 10),
        value: num,
        unit: protocol.unit,
        notes: `Kamera ile ölçüldü, antrenör onaylı. ${result.method}.${edited ? ` Otomatik ölçüm ${result.value} ${protocol.unit}, onaylanan değer düzeltildi.` : ""}`,
      });
      toast({ title: "Kaydedildi", description: `${protocol.name}: ${num} ${protocol.unit}` });
      onSaved();
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error("Camera measure save error:", e);
      toast({ title: "Hata", description: "Ölçüm kaydedilemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Video className="h-5 w-5 text-emerald-600" />
            Kamerayla Ölç — {student.name}
          </DialogTitle>
          <DialogDescription>
            Telefon/tablet kamerası ile sprint, plank ve dikey sıçrama otomatik ölçülür. Sonuç, siz onaylamadan kaydedilmez.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <Tabs value={kind} onValueChange={(v) => v && setKind(v as Kind)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sprint">Sprint</TabsTrigger>
                <TabsTrigger value="plank">Plank</TabsTrigger>
                <TabsTrigger value="jump">Sıçrama</TabsTrigger>
              </TabsList>
            </Tabs>

            {kind === "sprint" && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Mesafe:</Label>
                {SPRINT_DISTANCES.map((d) => (
                  <Button key={d} size="sm" variant={distance === d ? "default" : "outline"} onClick={() => setDistance(d)}>
                    {d} m
                  </Button>
                ))}
              </div>
            )}

            {!protocol && (
              <Alert variant="destructive">
                <AlertDescription>
                  {kind === "plank" ? "“Plank”" : kind === "jump" ? "“Dikey Sıçrama”" : `“${distance}m Sprint”`} test protokolü bulunamadı. Ayarlar → Test Protokolleri bölümünden ekleyin.
                </AlertDescription>
              </Alert>
            )}

            {protocol &&
              (kind === "sprint" ? (
                <SprintMeter key={`s-${distance}-${session}`} distance={distance} onResult={handleResult} />
              ) : kind === "jump" ? (
                <JumpMeter key={`j-${session}`} heightCm={(student as { height_cm?: number | null }).height_cm} onResult={handleResult} />
              ) : (
                <PlankMeter key={`p-${session}`} onResult={handleResult} />
              ))}
          </div>
        )}

        {result && protocol && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {result.snapshots.map((s) => (
                <figure key={s.label} className="overflow-hidden rounded-md border">
                  {s.src && <img src={s.src} alt={s.label} className="w-full" />}
                  <figcaption className="px-2 py-1 text-xs text-muted-foreground">{s.label}</figcaption>
                </figure>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="measured">
                {protocol.name} — {result.label ?? "ölçülen süre"} ({protocol.unit})
              </Label>
              <Input id="measured" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-[180px] text-lg font-semibold" />
              {result.detail && <p className="text-sm">{result.detail}</p>}
              <p className="text-xs text-muted-foreground">{result.method}. Gerekirse değeri düzeltebilirsiniz.</p>
            </div>

            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
              <span>Ölçümü kontrol ettim; bu değerin {student.name} için doğru olduğunu onaylıyorum.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={!confirmed || !valid || saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Onayla ve Kaydet
              </Button>
              <Button variant="outline" onClick={reset} disabled={saving}>
                <RotateCcw className="mr-2 h-4 w-4" /> Tekrar Ölç
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

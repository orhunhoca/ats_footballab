import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { whatsappService } from "@/services/whatsappService";
import type { PerformanceTest } from "@/services/performanceService";
import type { Student } from "@/services/studentService";
import { analyzeStudentTests, buildParentSummary, buildResultsLine } from "@/lib/performanceAnalysis";
import { formatTrPhone, normalizeTrPhone } from "@/lib/phone";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  tests: PerformanceTest[];
  /** Yapay zekâ/otomatik analizden gelen veli özeti (varsa) */
  suggestedEvaluation?: string;
}

interface Recipient {
  id: "mother" | "father";
  label: string;
  name: string;
  phone: string;
  normalized: string;
}

type SendState = Record<string, { status: "sending" | "ok" | "error"; error?: string }>;

const EVALUATION_MAX = 280;

export function SendPerformanceReportDialog({ open, onOpenChange, student, tests, suggestedEvaluation }: Props) {
  const { toast } = useToast();
  const stats = useMemo(() => analyzeStudentTests(tests), [tests]);
  const [evaluation, setEvaluation] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendState>({});

  const recipients = useMemo<Recipient[]>(() => {
    const list: Recipient[] = [];
    const seen = new Set<string>();
    const candidates = [
      { id: "mother" as const, label: "Anne", name: student.mother_name, phone: student.mother_phone },
      { id: "father" as const, label: "Baba", name: student.father_name, phone: student.father_phone },
    ];
    for (const c of candidates) {
      const normalized = normalizeTrPhone(c.phone);
      if (!normalized || seen.has(normalized)) continue; // aynı numaraya iki kez gönderme
      seen.add(normalized);
      list.push({ id: c.id, label: c.label, name: c.name?.trim() || `${c.label} (veli)`, phone: c.phone ?? "", normalized });
    }
    return list;
  }, [student]);

  useEffect(() => {
    if (!open) return;
    setResults({});
    setEvaluation((suggestedEvaluation || buildParentSummary(stats)).slice(0, EVALUATION_MAX));
    setSelected(Object.fromEntries(recipients.map((r) => [r.id, true])));
    setIsConfigured(null);
    whatsappService.getSettings().then((s) => setIsConfigured(!!s?.is_active));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student.id]);

  const testDate = stats.latestDate ? new Date(stats.latestDate).toLocaleDateString("tr-TR") : "-";
  const resultsLine = useMemo(() => buildResultsLine(stats), [stats]);
  const chosen = recipients.filter((r) => selected[r.id]);
  const canSend = isConfigured === true && chosen.length > 0 && evaluation.trim().length > 0 && stats.metrics.length > 0 && !sending;

  const previewFor = (r: Recipient) =>
    `Sayın ${r.name}, ${student.name} adlı öğrencimizin ${testDate} tarihli performans test sonuçları: ${resultsLine} Değerlendirme: ${evaluation.trim()} FootballLab Futbol Okulu`;

  const handleSend = async () => {
    setSending(true);
    setResults({});
    let ok = 0;
    for (const r of chosen) {
      setResults((prev) => ({ ...prev, [r.id]: { status: "sending" } }));
      const res = await whatsappService.sendPerformanceReport({
        studentId: student.id,
        studentName: student.name,
        parentName: r.name,
        phoneNumber: r.normalized,
        testDate,
        results: resultsLine,
        evaluation: evaluation.trim(),
      });
      if (res.success) ok++;
      setResults((prev) => ({ ...prev, [r.id]: res.success ? { status: "ok" } : { status: "error", error: res.error } }));
    }
    setSending(false);
    toast({
      title: ok === chosen.length ? "Rapor gönderildi" : ok > 0 ? "Kısmen gönderildi" : "Gönderilemedi",
      description: `${ok}/${chosen.length} veliye WhatsApp ile iletildi.`,
      variant: ok === 0 ? "destructive" : "default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Test Sonuçlarını Veliye Gönder
          </DialogTitle>
          <DialogDescription>
            {student.name} için son test sonuçları, kayıtlı veli numaralarına WhatsApp ile gönderilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          {isConfigured === false && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WhatsApp henüz bağlı değil. Ayarlar → WhatsApp bölümünden bağlantı kurulup etkinleştirildiğinde gönderim açılır.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Alıcılar</Label>
            {recipients.length === 0 ? (
              <p className="text-sm text-destructive">
                Bu öğrencinin kayıtlı geçerli bir anne/baba telefon numarası yok. Öğrenci kaydından ekleyin.
              </p>
            ) : (
              recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-md border p-3">
                  <Checkbox
                    id={`rcp-${r.id}`}
                    checked={!!selected[r.id]}
                    disabled={sending}
                    onCheckedChange={(v) => setSelected((p) => ({ ...p, [r.id]: v === true }))}
                  />
                  <Label htmlFor={`rcp-${r.id}`} className="flex-1 min-w-0 cursor-pointer">
                    <span className="block font-medium truncate">{r.label}: {r.name}</span>
                    <span className="block text-xs text-muted-foreground">{formatTrPhone(r.phone)}</span>
                  </Label>
                  {results[r.id]?.status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {results[r.id]?.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {results[r.id]?.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              ))
            )}
            {Object.entries(results).map(([id, r]) =>
              r.status === "error" ? (
                <p key={id} className="text-xs text-destructive break-words">
                  {recipients.find((x) => x.id === id)?.label}: {r.error}
                </p>
              ) : null
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluation">Veliye gidecek değerlendirme</Label>
            <Textarea
              id="evaluation"
              value={evaluation}
              maxLength={EVALUATION_MAX}
              rows={3}
              disabled={sending}
              onChange={(e) => setEvaluation(e.target.value.replace(/[\r\n]+/g, " "))}
            />
            <p className="text-xs text-muted-foreground text-right">{evaluation.length}/{EVALUATION_MAX}</p>
          </div>

          {chosen[0] && (
            <div className="space-y-1">
              <Label>Mesaj önizleme</Label>
              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm text-slate-800 whitespace-pre-wrap break-words">
                {previewFor(chosen[0])}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Kapat
          </Button>
          <Button onClick={handleSend} disabled={!canSend} className="bg-emerald-600 hover:bg-emerald-700">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            {sending ? "Gönderiliyor..." : `WhatsApp ile Gönder (${chosen.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

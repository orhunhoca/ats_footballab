import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { whatsappService } from "@/services/whatsappService";
import { getParentRecipients } from "@/lib/parentContacts";
import { formatTrPhone } from "@/lib/phone";
import { useToast } from "@/hooks/use-toast";

export interface AttendanceStudent {
  id: string;
  name: string;
  mother_name?: string | null;
  mother_phone?: string | null;
  father_name?: string | null;
  father_phone?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  groupName: string;
  students: AttendanceStudent[];
  /** öğrenci id -> geldi mi */
  attendance: Record<string, boolean>;
}

type Mode = "absent" | "all";
type RowResult = { status: "sending" | "ok" | "error"; error?: string };

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function SendAttendanceNotificationDialog({ open, onOpenChange, date, groupName, students, attendance }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("absent");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, RowResult>>({});

  const dateTr = date.toLocaleDateString("tr-TR");
  // Şablon metni "bugünkü antrenman" dediği için yalnızca bugün için gönderilebilir
  const isToday = isSameLocalDay(date, new Date());

  const rows = useMemo(
    () =>
      students
        .map((s) => ({ student: s, present: !!attendance[s.id], recipients: getParentRecipients(s) }))
        .filter((r) => (mode === "all" ? true : !r.present)),
    [students, attendance, mode]
  );

  useEffect(() => {
    if (!open) return;
    setResults({});
    setMode("absent");
    setIsConfigured(null);
    whatsappService.getSettings().then((s) => setIsConfigured(!!s?.is_active));
    // Bu tarih için daha önce bildirim gidenler
    const since = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    whatsappService
      .getRecentlySentStudentIds("attendance", students.map((s) => s.id), since, dateTr)
      .then(setAlreadySent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mod/satırlar değişince varsayılan seçim: telefonu olan ve daha önce gönderilmemiş olanlar
  useEffect(() => {
    setSelected(
      Object.fromEntries(rows.map((r) => [r.student.id, r.recipients.length > 0 && !alreadySent.has(r.student.id)]))
    );
  }, [rows, alreadySent]);

  const chosen = rows.filter((r) => selected[r.student.id] && r.recipients.length > 0);
  const canSend = isConfigured === true && isToday && chosen.length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    setResults({});
    let ok = 0;
    for (const r of chosen) {
      setResults((p) => ({ ...p, [r.student.id]: { status: "sending" } }));
      let failure: string | undefined;
      for (const rcp of r.recipients) {
        const res = await whatsappService.sendAttendanceNotification(
          r.student.id,
          rcp.normalized,
          r.student.name,
          r.present,
          date.toISOString(),
          rcp.name
        );
        if (!res.success) failure = res.error || "Gönderilemedi";
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!failure) ok++;
      setResults((p) => ({ ...p, [r.student.id]: failure ? { status: "error", error: failure } : { status: "ok" } }));
    }
    setSending(false);
    toast({
      title: ok === chosen.length ? "Bildirimler gönderildi" : ok > 0 ? "Kısmen gönderildi" : "Gönderilemedi",
      description: `${ok}/${chosen.length} öğrencinin velisine WhatsApp ile iletildi.`,
      variant: ok === 0 ? "destructive" : "default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Velilere Yoklama Bildirimi
          </DialogTitle>
          <DialogDescription>
            {dateTr} · {groupName}. Mesaj: "{`{öğrenci} bugünkü antrenmanımıza katıldı/katılmadı`}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          {isConfigured === false && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WhatsApp henüz bağlı değil. Ayarlar → WhatsApp bölümünden bağlantı kurulunca gönderim açılır.
              </AlertDescription>
            </Alert>
          )}
          {!isToday && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Mesaj şablonu "bugünkü antrenman" dediği için yalnızca bugünün yoklaması için gönderilebilir.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Önce "Yoklamayı Kaydet"e basın; bildirim ekrandaki güncel işaretlere göre gider.
          </p>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="absent" id="mode-absent" disabled={sending} />
              <Label htmlFor="mode-absent">Yalnızca gelmeyenler</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="mode-all" disabled={sending} />
              <Label htmlFor="mode-all">Tüm öğrenciler</Label>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {mode === "absent" ? "Gelmeyen öğrenci yok." : "Bu grupta öğrenci yok."}
              </p>
            ) : (
              rows.map((r) => {
                const noPhone = r.recipients.length === 0;
                const res = results[r.student.id];
                return (
                  <div key={r.student.id} className="flex items-center gap-3 rounded-md border p-3">
                    <Checkbox
                      id={`att-${r.student.id}`}
                      checked={!!selected[r.student.id]}
                      disabled={sending || noPhone}
                      onCheckedChange={(v) => setSelected((p) => ({ ...p, [r.student.id]: v === true }))}
                    />
                    <Label htmlFor={`att-${r.student.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <span className="block font-medium truncate">
                        {r.student.name} · {r.present ? "Geldi" : "Gelmedi"}
                      </span>
                      <span className="block text-xs text-muted-foreground break-words">
                        {noPhone
                          ? "Kayıtlı veli telefonu yok"
                          : r.recipients.map((x) => `${x.label}: ${formatTrPhone(x.phone)}`).join(" · ")}
                        {alreadySent.has(r.student.id) && " · bu tarih için zaten gönderildi"}
                      </span>
                      {res?.status === "error" && (
                        <span className="block text-xs text-destructive break-words">{res.error}</span>
                      )}
                    </Label>
                    {res?.status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {res?.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {res?.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                );
              })
            )}
          </div>
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

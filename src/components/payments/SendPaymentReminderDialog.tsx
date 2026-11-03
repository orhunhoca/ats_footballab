import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle, CheckCircle2, XCircle, AlertTriangle, Search } from "lucide-react";
import { whatsappService } from "@/services/whatsappService";
import { getParentRecipients } from "@/lib/parentContacts";
import { formatTrPhone } from "@/lib/phone";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  students: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: any[];
}

type RowResult = { status: "sending" | "ok" | "error"; error?: string };
const RESEND_BLOCK_DAYS = 7;
const PAID_STATUSES = ["paid", "ödendi"];

const toDateInput = (value?: string | null) => (value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10));

export function SendPaymentReminderDialog({ open, onOpenChange, students, payments }: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [recentlySent, setRecentlySent] = useState<Set<string>>(new Set());
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Record<string, RowResult>>({});

  // Borcu kalan aktif öğrenciler: kalan = ödeme tutarı − yapılan ödemeler
  const candidates = useMemo(() => {
    const paidByStudent = new Map<string, number>();
    for (const p of payments) {
      paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) || 0) + Number(p.amount || 0));
    }
    return students
      .filter((s) => !s.status || s.status === "Aktif")
      .filter((s) => !PAID_STATUSES.includes(String(s.payment_status || "").toLowerCase()))
      .map((s) => {
        const remaining = Math.max(0, Number(s.payment_amount || 0) - (paidByStudent.get(s.id) || 0));
        return { student: s, remaining, recipients: getParentRecipients(s) };
      })
      .filter((c) => c.remaining > 0);
  }, [students, payments]);

  useEffect(() => {
    if (!open) return;
    setResults({});
    setSearch("");
    setIsConfigured(null);
    whatsappService.getSettings().then((s) => setIsConfigured(!!s?.is_active));
    const since = new Date(Date.now() - RESEND_BLOCK_DAYS * 86400000).toISOString();
    whatsappService
      .getRecentlySentStudentIds("payment_reminder", candidates.map((c) => c.student.id), since)
      .then((sent) => {
        setRecentlySent(sent);
        setSelected(
          Object.fromEntries(candidates.map((c) => [c.student.id, c.recipients.length > 0 && !sent.has(c.student.id)]))
        );
      });
    setAmounts(Object.fromEntries(candidates.map((c) => [c.student.id, String(c.remaining)])));
    setDates(
      Object.fromEntries(
        candidates.map((c) => [c.student.id, toDateInput(c.student.installment_date || c.student.registration_end_date)])
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = candidates.filter((c) => c.student.name.toLowerCase().includes(search.toLowerCase()));
  const chosen = candidates.filter((c) => selected[c.student.id] && c.recipients.length > 0);
  const invalid = chosen.some((c) => !(Number(amounts[c.student.id]) > 0) || !dates[c.student.id]);
  const canSend = isConfigured === true && chosen.length > 0 && !invalid && !sending;

  const handleSend = async () => {
    setSending(true);
    setResults({});
    let ok = 0;
    for (const c of chosen) {
      const id = c.student.id;
      setResults((p) => ({ ...p, [id]: { status: "sending" } }));
      let failure: string | undefined;
      for (const rcp of c.recipients) {
        const res = await whatsappService.sendPaymentReminder(
          id,
          rcp.normalized,
          c.student.name,
          Number(amounts[id]),
          dates[id],
          rcp.name
        );
        if (!res.success) failure = res.error || "Gönderilemedi";
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!failure) ok++;
      setResults((p) => ({ ...p, [id]: failure ? { status: "error", error: failure } : { status: "ok" } }));
    }
    setSending(false);
    toast({
      title: ok === chosen.length ? "Hatırlatmalar gönderildi" : ok > 0 ? "Kısmen gönderildi" : "Gönderilemedi",
      description: `${ok}/${chosen.length} öğrencinin velisine WhatsApp ile iletildi.`,
      variant: ok === 0 ? "destructive" : "default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Ödeme Hatırlatması Gönder
          </DialogTitle>
          <DialogDescription>
            Borcu görünen öğrencilerin velilerine WhatsApp şablonuyla hatırlatma gider. Tutar ve tarihi göndermeden önce
            düzenleyebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 min-w-0">
          {isConfigured === false && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                WhatsApp henüz bağlı değil. Ayarlar → WhatsApp bölümünden bağlantı kurulunca gönderim açılır.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Son {RESEND_BLOCK_DAYS} günde hatırlatma gönderilenler varsayılan olarak seçili gelmez. Kalan tutar, öğrencinin
            ödeme tutarından kayıtlı ödemeler düşülerek hesaplanır.
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Öğrenci ara..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-2">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Borcu görünen aktif öğrenci yok.</p>
            ) : (
              visible.map((c) => {
                const id = c.student.id;
                const noPhone = c.recipients.length === 0;
                const res = results[id];
                return (
                  <div key={id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`pay-${id}`}
                        checked={!!selected[id]}
                        disabled={sending || noPhone}
                        onCheckedChange={(v) => setSelected((p) => ({ ...p, [id]: v === true }))}
                      />
                      <Label htmlFor={`pay-${id}`} className="flex-1 min-w-0 cursor-pointer">
                        <span className="block font-medium truncate">{c.student.name}</span>
                        <span className="block text-xs text-muted-foreground break-words">
                          {noPhone
                            ? "Kayıtlı veli telefonu yok"
                            : c.recipients.map((x) => `${x.label}: ${formatTrPhone(x.phone)}`).join(" · ")}
                          {recentlySent.has(id) && ` · son ${RESEND_BLOCK_DAYS} günde gönderildi`}
                        </span>
                      </Label>
                      {res?.status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                      {res?.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {res?.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      <div>
                        <Label className="text-xs">Tutar (₺)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={amounts[id] ?? ""}
                          disabled={sending}
                          onChange={(e) => setAmounts((p) => ({ ...p, [id]: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Son ödeme tarihi</Label>
                        <Input
                          type="date"
                          value={dates[id] ?? ""}
                          disabled={sending}
                          onChange={(e) => setDates((p) => ({ ...p, [id]: e.target.value }))}
                        />
                      </div>
                    </div>
                    {res?.status === "error" && <p className="pl-7 text-xs text-destructive break-words">{res.error}</p>}
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

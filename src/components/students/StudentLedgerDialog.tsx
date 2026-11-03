import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Wallet, XCircle } from "lucide-react";
import {
  chargeService,
  chargeTypeLabel,
  CHARGE_TYPE_LABELS,
  type ChargeType,
  type StudentBalance,
  type StudentChargeStatus,
} from "@/services/chargeService";
import { paymentService } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; name: string } | null;
}

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(Number(n || 0));
const date = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");
const today = () => new Date().toISOString().slice(0, 10);

type Payment = Awaited<ReturnType<typeof paymentService.getStudentPayments>>[number];

/** Öğrencinin borç kalemleri, ödemeleri ve bakiyesi. Yalnızca yönetim (admin + yönetici) kullanır. */
export function StudentLedgerDialog({ open, onOpenChange, student }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<StudentBalance | null>(null);
  const [charges, setCharges] = useState<StudentChargeStatus[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    chargeType: "registration" as ChargeType,
    totalAmount: "",
    installmentCount: "1",
    firstDueDate: today(),
    description: "",
  });

  const load = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [b, c, p] = await Promise.all([
        chargeService.getBalance(student.id),
        chargeService.listCharges(student.id),
        paymentService.getStudentPayments(student.id),
      ]);
      setBalance(b);
      setCharges(c);
      setPayments(p);
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Hesap bilgileri yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [student, toast]);

  useEffect(() => {
    if (open) {
      setShowForm(false);
      load();
    }
  }, [open, load]);

  const save = async () => {
    if (!student) return;
    const total = Number(form.totalAmount.replace(",", "."));
    const count = Number(form.installmentCount);
    if (!(total > 0) || !Number.isInteger(count) || count < 1 || count > 36 || !form.firstDueDate) {
      toast({ title: "Eksik bilgi", description: "Tutar, taksit sayısı (1-36) ve ilk vade tarihi gerekli.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await chargeService.createInstallmentPlan({
        studentId: student.id,
        chargeType: form.chargeType,
        totalAmount: total,
        installmentCount: count,
        firstDueDate: form.firstDueDate,
        description: form.description.trim() || undefined,
      });
      toast({ title: "Borç eklendi", description: count > 1 ? `${count} taksit oluşturuldu.` : "Borç kalemi oluşturuldu." });
      setShowForm(false);
      setForm({ ...form, totalAmount: "", installmentCount: "1", description: "" });
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Borç eklenemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (c: StudentChargeStatus) => {
    if (!window.confirm(`${chargeTypeLabel(c.charge_type)} (${money(c.amount)}) borcu iptal edilsin mi?`)) return;
    try {
      await chargeService.cancelCharge(c.id);
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "İptal edilemedi.", variant: "destructive" });
    }
  };

  const owed = Number(balance?.balance || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Hesap Özeti — {student?.name}
          </DialogTitle>
          <DialogDescription>Borç kalemleri ve ödemeler. Yapılan ödemeler en eski vadeli borçtan başlayarak düşülür.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="min-w-0 space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Toplam Borç</p>
                <p className="font-semibold">{money(balance?.total_charged)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Ödenen</p>
                <p className="font-semibold text-emerald-700">{money(balance?.total_paid)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">{owed < 0 ? "Fazla Ödeme" : "Kalan Borç"}</p>
                <p className={`font-semibold ${owed > 0 ? "text-red-600" : "text-gray-900"}`}>{money(Math.abs(owed))}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Geciken</p>
                <p className={`font-semibold ${Number(balance?.overdue_amount) > 0 ? "text-red-600" : "text-gray-900"}`}>{money(balance?.overdue_amount)}</p>
              </div>
            </div>
            {balance?.next_due_date && (
              <p className="text-sm text-gray-700">
                Sıradaki vade: <strong>{date(balance.next_due_date)}</strong> — {money(balance.next_due_amount)}
              </p>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Borç kalemleri</h4>
                <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Borç Ekle
                </Button>
              </div>

              {showForm && (
                <div className="space-y-3 rounded-md border bg-gray-50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Tür</Label>
                      <Select value={form.chargeType} onValueChange={(v) => setForm({ ...form, chargeType: v as ChargeType })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHARGE_TYPE_LABELS).map(([k, label]) => (
                            <SelectItem key={k} value={k}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ch-total">Toplam Tutar (₺)</Label>
                      <Input id="ch-total" inputMode="decimal" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ch-count">Taksit Sayısı (1 = peşin)</Label>
                      <Input id="ch-count" type="number" min={1} max={36} value={form.installmentCount} onChange={(e) => setForm({ ...form, installmentCount: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="ch-due">İlk Vade Tarihi</Label>
                      <Input id="ch-due" type="date" value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ch-desc">Açıklama (isteğe bağlı)</Label>
                    <Input id="ch-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <p className="text-xs text-gray-600">Taksitler eşit bölünür, her biri bir ay arayla vadelenir.</p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                      Vazgeç
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Kaydet
                    </Button>
                  </div>
                </div>
              )}

              {charges.length === 0 ? (
                <p className="text-sm text-gray-600">Bu öğrenci için borç kalemi yok.</p>
              ) : (
                charges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {chargeTypeLabel(c.charge_type)}
                        {c.installment_no ? ` · ${c.installment_no}. taksit` : ""}
                        {c.description ? <span className="font-normal text-gray-600"> — {c.description}</span> : null}
                      </p>
                      <p className="text-xs text-gray-600">
                        Vade {date(c.due_date)} · {money(c.amount)} · ödenen {money(c.paid_amount)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {Number(c.remaining_amount) <= 0 ? (
                        <Badge>Ödendi</Badge>
                      ) : c.is_overdue ? (
                        <Badge variant="destructive">Gecikti {money(c.remaining_amount)}</Badge>
                      ) : (
                        <Badge variant="secondary">Kalan {money(c.remaining_amount)}</Badge>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Borcu iptal et" onClick={() => cancel(c)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Ödemeler</h4>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/payments">Ödeme Gir</Link>
                </Button>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-600">Henüz ödeme yok.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <span>
                      {date(p.payment_date)} · {p.payment_method}
                    </span>
                    <span className="font-medium text-emerald-700">{money(p.amount)}</span>
                  </div>
                ))
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

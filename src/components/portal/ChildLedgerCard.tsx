import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parentService, type ChildLedger } from "@/services/parentService";
import { chargeTypeLabel } from "@/services/chargeService";

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(Number(n || 0));
const date = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");

/** Velinin portalında çocuğun borç / ödeme özeti ve ödeme yapılacak banka hesapları (yalnızca görüntüleme). */
export function ChildLedgerCard({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [ledger, setLedger] = useState<ChildLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    parentService
      .getChildLedger(studentId)
      .then((l) => alive && setLedger(l))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [studentId]);

  if (failed) return null;
  const owed = Number(ledger?.balance || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5 text-emerald-600" />
          {studentName} — Ödeme Durumu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading || !ledger ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
        ) : ledger.charges.length === 0 && ledger.payments.length === 0 ? (
          <p className="text-gray-600">Henüz tanımlı bir ödeme planı bulunmuyor.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Toplam</p>
                <p className="font-semibold">{money(ledger.total_charged)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Ödenen</p>
                <p className="font-semibold text-emerald-700">{money(ledger.total_paid)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">{owed < 0 ? "Fazla Ödeme" : "Kalan"}</p>
                <p className={`font-semibold ${owed > 0 ? "text-red-600" : ""}`}>{money(Math.abs(owed))}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-xs text-gray-600">Geciken</p>
                <p className={`font-semibold ${ledger.overdue_amount > 0 ? "text-red-600" : ""}`}>{money(ledger.overdue_amount)}</p>
              </div>
            </div>
            {ledger.next_due_date && <p>Sıradaki ödeme tarihi: <strong>{date(ledger.next_due_date)}</strong></p>}

            <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Ayrıntıyı gizle" : "Ayrıntıyı göster"}
            </Button>
            {open && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-semibold">Borç kalemleri</h4>
                  {ledger.charges.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {chargeTypeLabel(c.charge_type)}
                          {c.installment_no ? ` · ${c.installment_no}. taksit` : ""}
                        </p>
                        <p className="text-xs text-gray-600">Vade {date(c.due_date)} · {money(c.amount)}</p>
                      </div>
                      {c.remaining_amount <= 0 ? (
                        <Badge>Ödendi</Badge>
                      ) : c.is_overdue ? (
                        <Badge variant="destructive">Gecikti {money(c.remaining_amount)}</Badge>
                      ) : (
                        <Badge variant="secondary">Kalan {money(c.remaining_amount)}</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {ledger.payments.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-semibold">Yapılan ödemeler</h4>
                    {ledger.payments.map((p, i) => (
                      <div key={i} className="flex justify-between rounded-md border p-2">
                        <span>{date(p.payment_date)} · {p.payment_method}</span>
                        <span className="font-medium text-emerald-700">{money(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ledger.bank_accounts.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="font-semibold">Havale / EFT için hesap bilgileri</h4>
                    {ledger.bank_accounts.map((b, i) => (
                      <div key={i} className="rounded-md border p-2">
                        <p className="font-medium">{b.bank_name} — {b.account_holder}</p>
                        <p className="select-all break-all font-mono text-xs">{b.iban}</p>
                        {b.description && <p className="text-xs text-gray-600">{b.description}</p>}
                      </div>
                    ))}
                    <p className="text-xs text-gray-600">Ödemeniz okul yönetimi tarafından sisteme işlendiğinde bakiyenizden düşer.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

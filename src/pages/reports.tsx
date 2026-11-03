import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranch } from "@/contexts/BranchContext";
import { reportService, periodRange, PERIOD_LABELS, type FinanceReport, type PeriodKey } from "@/services/reportService";
import { chargeTypeLabel } from "@/services/chargeService";
import { AttendanceReportTab } from "@/components/reports/AttendanceReportTab";
import { PerformanceReportTab } from "@/components/reports/PerformanceReportTab";
import { Loader2, TrendingUp, Wallet, AlertTriangle, Building2, CalendarClock } from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(amount) || 0);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");
const today = () => new Date().toISOString().slice(0, 10);

function ReportsPageInner() {
  const { isManagement: isAdmin, loading: roleLoading } = useUserRole();
  const { selectedBranchId, getBranchName } = useBranch();
  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [customFrom, setCustomFrom] = useState(() => periodRange("thisMonth").from);
  const [customTo, setCustomTo] = useState(today);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = period === "custom" ? { from: customFrom, to: customTo } : periodRange(period);
  const rangeValid = !!range.from && !!range.to && range.to >= range.from;

  const load = useCallback(async () => {
    if (!rangeValid) return;
    setLoading(true);
    setError("");
    try {
      setReport(await reportService.getFinanceReport(range.from, range.to, selectedBranchId));
    } catch (e) {
      console.error("Error loading finance report:", e);
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, selectedBranchId, rangeValid]);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  if (roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const byType = report?.collected.by_type ?? {};
  const clothing = Number(byType.summer_clothing || 0) + Number(byType.winter_clothing || 0);
  const registration = Number(byType.registration || 0);
  const other = Number(byType.other || 0);

  return (
    <>
      <SEO title="Raporlar - FootbalLab" />

      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Raporlar & İstatistikler</h1>
            <p className="mt-1 text-gray-600">Mali durum, katılım oranları ve performans analizleri</p>
          </div>

          <BranchFilterBar />

          <Tabs defaultValue={isAdmin ? "financial" : "attendance"} className="space-y-6">
            <TabsList>
              {isAdmin && <TabsTrigger value="financial">Mali Raporlar</TabsTrigger>}
              <TabsTrigger value="attendance">Katılım Raporları</TabsTrigger>
              <TabsTrigger value="performance">Performans</TabsTrigger>
            </TabsList>

            {isAdmin && (
              <TabsContent value="financial" className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="space-y-1">
                    <Label>Dönem</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
                          <SelectItem key={k} value={k}>
                            {PERIOD_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {period === "custom" && (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="rep-from">Başlangıç</Label>
                        <Input id="rep-from" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rep-to">Bitiş</Label>
                        <Input id="rep-to" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
                      </div>
                    </>
                  )}
                  <p className="flex items-center gap-2 text-sm text-gray-600 sm:ml-auto">
                    <Building2 className="h-4 w-4" />
                    Kapsam: <strong>{selectedBranchId ? getBranchName(selectedBranchId) : "Tüm Şubeler"}</strong>
                    {rangeValid && (
                      <span className="text-gray-500">
                        · {formatDate(range.from)} – {formatDate(range.to)}
                      </span>
                    )}
                  </p>
                </div>

                {!rangeValid && (
                  <Alert variant="destructive">
                    <AlertDescription>Bitiş tarihi başlangıçtan önce olamaz.</AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading || !report ? (
                  !error && rangeValid && (
                    <Card className="p-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                    </Card>
                  )
                ) : (
                  <div className="grid gap-6">
                    {/* Tahsilat */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                          Tahsilat (dönemde alınan ödemeler)
                        </CardTitle>
                        <CardDescription>Yöneticinin sisteme girdiği gerçek ödemelerden hesaplanır.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="mb-1 text-sm text-gray-600">Toplam Tahsilat ({report.collected.count} ödeme)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.collected.total)}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                            <p className="mb-1 text-sm text-emerald-700">Kayıt / Aidat</p>
                            <p className="text-xl font-bold text-emerald-700">{formatCurrency(registration)}</p>
                          </div>
                          <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
                            <p className="mb-1 text-sm text-purple-700">Kıyafet</p>
                            <p className="text-xl font-bold text-purple-700">{formatCurrency(clothing)}</p>
                          </div>
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <p className="mb-1 text-sm text-blue-700">Diğer</p>
                            <p className="text-xl font-bold text-blue-700">{formatCurrency(other)}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-lg border p-4">
                            <p className="mb-1 text-sm text-gray-600">Dönemde vadesi gelen borç</p>
                            <p className="text-lg font-semibold">{formatCurrency(report.due_in_period)}</p>
                          </div>
                          <div className="rounded-lg border p-4">
                            <p className="mb-1 text-sm text-gray-600">Yeni kayıt / yenileme (öğrenci sayısı)</p>
                            <p className="text-lg font-semibold">
                              {report.registrations.new} yeni · {report.registrations.renewal} yenileme
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ödeme yöntemleri */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-blue-600" />
                          Ödeme Yöntemine Göre
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        {report.collected.by_method.length === 0 ? (
                          <p className="text-sm text-gray-600">Bu dönemde ödeme kaydı yok.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-gray-600">
                                <th className="py-2 pr-4 font-medium">Yöntem</th>
                                <th className="py-2 pr-4 text-right font-medium">Adet</th>
                                <th className="py-2 text-right font-medium">Tutar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.collected.by_method.map((m) => (
                                <tr key={m.method} className="border-b last:border-0">
                                  <td className="py-2 pr-4">{m.method}</td>
                                  <td className="py-2 pr-4 text-right">{m.count}</td>
                                  <td className="py-2 text-right font-medium">{formatCurrency(m.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </CardContent>
                    </Card>

                    {/* Alacak */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          Alacaklar (bugünkü durum)
                        </CardTitle>
                        <CardDescription>Borç kalemleri ve ödemelerden hesaplanır; seçilen dönemden bağımsızdır.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg bg-gray-50 p-4">
                            <p className="mb-1 text-sm text-gray-600">Açık Alacak ({report.receivable.debtors} öğrenci)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.receivable.open_total)}</p>
                          </div>
                          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                            <p className="mb-1 text-sm text-red-700">Geciken ({report.receivable.overdue_students} öğrenci)</p>
                            <p className="text-xl font-bold text-red-700">{formatCurrency(report.receivable.overdue_total)}</p>
                          </div>
                          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                            <p className="mb-1 flex items-center gap-1 text-sm text-amber-700">
                              <CalendarClock className="h-4 w-4" />
                              Önümüzdeki 30 gün vadesi gelecek
                            </p>
                            <p className="text-xl font-bold text-amber-700">{formatCurrency(report.receivable.due_next_30)}</p>
                          </div>
                        </div>

                        {report.top_overdue.length > 0 && (
                          <div className="overflow-x-auto">
                            <h4 className="mb-2 text-sm font-semibold">En yüksek gecikmeli borçlar</h4>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-gray-600">
                                  <th className="py-2 pr-4 font-medium">Öğrenci</th>
                                  <th className="py-2 pr-4 font-medium">İlk gecikmiş vade</th>
                                  <th className="py-2 text-right font-medium">Geciken Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.top_overdue.map((o) => (
                                  <tr key={o.student_id} className="border-b last:border-0">
                                    <td className="py-2 pr-4 font-medium">{o.name}</td>
                                    <td className="py-2 pr-4">{o.oldest_due ? formatDate(o.oldest_due) : "-"}</td>
                                    <td className="py-2 text-right font-medium text-red-700">{formatCurrency(o.overdue_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {report.receivable.open_total === 0 && (
                          <p className="text-sm text-gray-600">
                            Açık alacak yok. Alacaklar, öğrenci kartındaki <Badge variant="outline">Hesap Özeti</Badge> ya da kayıt sırasında tanımlanan borçlardan oluşur.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Şube bazında */}
                    {!selectedBranchId && report.by_branch.length > 1 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-emerald-600" />
                            Şube Bazında
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-gray-600">
                                <th className="py-2 pr-4 font-medium">Şube</th>
                                <th className="py-2 pr-4 text-right font-medium">Tahsilat (dönem)</th>
                                <th className="py-2 pr-4 text-right font-medium">Açık Alacak</th>
                                <th className="py-2 text-right font-medium">Geciken</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.by_branch.map((b) => (
                                <tr key={b.branch_id ?? "none"} className="border-b last:border-0">
                                  <td className="py-2 pr-4 font-medium">{b.branch_id ? getBranchName(b.branch_id) : "Şubesiz"}</td>
                                  <td className="py-2 pr-4 text-right">{formatCurrency(b.collected)}</td>
                                  <td className="py-2 pr-4 text-right">{formatCurrency(b.open)}</td>
                                  <td className="py-2 text-right text-red-700">{formatCurrency(b.overdue)}</td>
                                </tr>
                              ))}
                              <tr className="font-semibold">
                                <td className="py-2 pr-4">Toplam</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(report.collected.total)}</td>
                                <td className="py-2 pr-4 text-right">{formatCurrency(report.receivable.open_total)}</td>
                                <td className="py-2 text-right text-red-700">{formatCurrency(report.receivable.overdue_total)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    )}

                    <p className="text-xs text-gray-500">
                      Tür adları: {["registration", "summer_clothing", "winter_clothing"].map(chargeTypeLabel).join(", ")}. Ödemeler girildiği tarihe göre dönemlenir.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="attendance">
              <AttendanceReportTab />
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceReportTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <RoleGate level="staff">
      <ReportsPageInner />
    </RoleGate>
  );
}

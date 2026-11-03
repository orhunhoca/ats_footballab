import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, ClipboardList, UserX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBranch } from "@/contexts/BranchContext";
import { reportService, type PerformanceReportData } from "@/services/reportService";
import { summarizePerformance } from "@/lib/performanceReport";
import { formatNumber, formatUnit } from "@/lib/performanceAnalysis";
import { PeriodPicker, usePeriod } from "./PeriodPicker";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  const cls = value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "text-gray-700";
  return (
    <span className={`font-medium ${cls}`}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}%{formatNumber(Math.abs(value))}
    </span>
  );
}

/** Performans raporu: yapılan test, ölçüm bazında ortalama/gelişim, en çok gelişen/gerileyen, test yapılmayanlar. */
export function PerformanceReportTab() {
  const { selectedBranchId, getBranchName } = useBranch();
  const p = usePeriod("last90");
  const [data, setData] = useState<PerformanceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { from, to } = p.range;
  const load = useCallback(async () => {
    if (!p.valid) return;
    setLoading(true);
    setError("");
    try {
      setData(await reportService.getPerformanceReport(from, to, selectedBranchId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, to, p.valid, selectedBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => (data ? summarizePerformance(data.tests) : null), [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <PeriodPicker state={p} />
        <p className="text-sm text-gray-600 sm:ml-auto">
          Kapsam: <strong>{selectedBranchId ? getBranchName(selectedBranchId) : "Tüm Şubeler"}</strong>
          {p.valid && <span className="text-gray-500"> · {fmtDate(from)} – {fmtDate(to)}</span>}
        </p>
      </div>

      {!p.valid && (
        <Alert variant="destructive">
          <AlertDescription>Bitiş tarihi başlangıçtan önce olamaz.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        </Card>
      ) : data && summary ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Test Özeti
              </CardTitle>
              <CardDescription>
                Gelişim, öğrencinin dönem içindeki ilk ve son ölçümü karşılaştırılarak hesaplanır; süre testlerinde düşük değer daha iyidir. Dönemde tek ölçümü olan öğrenci gelişim ortalamasına girmez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Yapılan Test</p>
                  <p className="text-2xl font-bold">{summary.totalTests}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Test Edilen Öğrenci</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {summary.testedStudents} <span className="text-base font-normal">/ {data.active_students} aktif</span>
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Dönemde Test Yapılmayan</p>
                  <p className="text-2xl font-bold text-amber-700">{data.untested_count}</p>
                </div>
              </div>
              {summary.totalTests >= 20000 && (
                <p className="mt-3 text-xs text-gray-500">Çok fazla test kaydı var; ilk 20.000 kayıt dikkate alındı. Dönemi daraltabilirsiniz.</p>
              )}
            </CardContent>
          </Card>

          {summary.totalTests === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-600">Bu dönemde performans testi kaydı yok.</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Ölçüme Göre</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2 pr-4 font-medium">Test</th>
                        <th className="py-2 pr-4 font-medium">Kategori</th>
                        <th className="py-2 pr-4 text-right font-medium">Öğrenci</th>
                        <th className="py-2 pr-4 text-right font-medium">Ort. Son Değer</th>
                        <th className="py-2 pr-4 text-right font-medium">Ort. Değişim</th>
                        <th className="py-2 text-right font-medium">Gelişen / Gerileyen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byMetric.map((m) => (
                        <tr key={m.key} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{m.name}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline">{m.category}</Badge>
                          </td>
                          <td className="py-2 pr-4 text-right">{m.students}</td>
                          <td className="py-2 pr-4 text-right">
                            {formatNumber(m.avgLatest)} {formatUnit(m.unit)}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <Change value={m.avgChangePct} />
                          </td>
                          <td className="py-2 text-right">
                            <span className="text-emerald-700">{m.improving}</span> / <span className="text-red-700">{m.declining}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {summary.byCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Kategoriye Göre Ortalama Gelişim</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {summary.byCategory.map((c) => (
                      <div key={c.category} className="rounded-lg border p-3">
                        <p className="text-sm text-gray-600">{c.category}</p>
                        <p className="text-lg">
                          <Change value={c.avgChangePct} />
                        </p>
                        <p className="text-xs text-gray-500">{c.students} öğrenci ölçümü</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      En Çok Gelişenler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.mostImproved.length === 0 ? (
                      <p className="text-sm text-gray-600">Karşılaştırılabilir gelişim yok (öğrencinin dönemde en az 2 ölçümü olmalı).</p>
                    ) : (
                      summary.mostImproved.map((s) => (
                        <div key={s.student_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <span className="font-medium">{s.name}</span>
                          <span>
                            <Change value={s.avgChangePct} /> <span className="text-xs text-gray-500">({s.metrics} test)</span>
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      Gerileyenler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.mostDeclined.length === 0 ? (
                      <p className="text-sm text-gray-600">Gerileyen öğrenci yok.</p>
                    ) : (
                      summary.mostDeclined.map((s) => (
                        <div key={s.student_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <span className="font-medium">{s.name}</span>
                          <span>
                            <Change value={s.avgChangePct} /> <span className="text-xs text-gray-500">({s.metrics} test)</span>
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {data.untested.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-amber-600" />
                  Dönemde Test Yapılmayan Öğrenciler
                </CardTitle>
                <CardDescription>En uzun süredir test yapılmayan {data.untested.length} öğrenci (toplam {data.untested_count}).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {data.untested.map((u) => (
                  <div key={u.student_id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-gray-600">{u.last_test ? `Son test: ${fmtDate(u.last_test)}` : "Hiç test yok"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

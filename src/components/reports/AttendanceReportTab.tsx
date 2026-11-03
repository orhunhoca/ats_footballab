import { useCallback, useEffect, useState } from "react";
import { Loader2, CalendarCheck, AlertTriangle, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "@/contexts/BranchContext";
import { reportService, type AttendanceReport } from "@/services/reportService";
import { PeriodPicker, usePeriod } from "./PeriodPicker";

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");
const ALL = "all";

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full min-w-[60px] rounded-full bg-gray-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${rate}%` }} />
    </div>
  );
}

/** Katılım raporu: oran, grup/hafta kırılımı, düşük katılımlı öğrenciler. */
export function AttendanceReportTab() {
  const { selectedBranchId, getBranchName } = useBranch();
  const p = usePeriod("thisMonth");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupId, setGroupId] = useState(ALL);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setGroupId(ALL);
    reportService.getGroups(selectedBranchId).then(setGroups).catch(() => setGroups([]));
  }, [selectedBranchId]);

  const { from, to } = p.range;
  const load = useCallback(async () => {
    if (!p.valid) return;
    setLoading(true);
    setError("");
    try {
      setReport(await reportService.getAttendanceReport(from, to, selectedBranchId, groupId === ALL ? null : groupId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [from, to, p.valid, selectedBranchId, groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const t = report?.totals;
  const rate = t ? pct(t.present, t.total) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <PeriodPicker state={p} />
        <div className="space-y-1">
          <Label>Grup</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm Gruplar</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {loading && !report ? (
        <Card className="p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
        </Card>
      ) : report && t ? (
        t.total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">Bu dönemde yoklama kaydı yok.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-600" />
                  Katılım Özeti
                </CardTitle>
                <CardDescription>Katılım oranı = katıldı / toplam yoklama kaydı.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                  <div className="rounded-lg bg-emerald-50 p-4 lg:col-span-2">
                    <p className="text-sm text-emerald-700">Katılım Oranı</p>
                    <p className="text-3xl font-bold text-emerald-700">%{rate}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Katıldı</p>
                    <p className="text-xl font-bold">{t.present}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Gelmedi</p>
                    <p className="text-xl font-bold text-red-700">{t.absent}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Mazeretli</p>
                    <p className="text-xl font-bold">{t.excused}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Antrenman / Öğrenci</p>
                    <p className="text-xl font-bold">
                      {t.sessions} / {t.students}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {report.by_week.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Haftalık Katılım</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.by_week.map((w) => {
                    const r = pct(w.present, w.total);
                    return (
                      <div key={w.week_start} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
                        <span className="text-gray-600">{fmtDate(w.week_start)} haftası</span>
                        <RateBar rate={r} />
                        <span className="text-right font-medium">
                          %{r} <span className="text-xs font-normal text-gray-500">({w.present}/{w.total})</span>
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {report.by_group.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Gruplara Göre
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2 pr-4 font-medium">Grup</th>
                        <th className="py-2 pr-4 text-right font-medium">Katıldı</th>
                        <th className="py-2 pr-4 text-right font-medium">Gelmedi</th>
                        <th className="py-2 pr-4 text-right font-medium">Mazeretli</th>
                        <th className="w-40 py-2 text-right font-medium">Oran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.by_group.map((g) => {
                        const r = pct(g.present, g.total);
                        return (
                          <tr key={g.group_id ?? "none"} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{g.name}</td>
                            <td className="py-2 pr-4 text-right">{g.present}</td>
                            <td className="py-2 pr-4 text-right">{g.absent}</td>
                            <td className="py-2 pr-4 text-right">{g.excused}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-2">
                                <RateBar rate={r} />
                                <span className="w-10 text-right font-medium">%{r}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Düşük Katılımlı Öğrenciler
                </CardTitle>
                <CardDescription>Dönemde en az 3 yoklama kaydı olup katılımı %60'ın altında olanlar (en düşük 10).</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {report.low_attendance.length === 0 ? (
                  <p className="text-sm text-gray-600">Düşük katılımlı öğrenci yok.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-600">
                        <th className="py-2 pr-4 font-medium">Öğrenci</th>
                        <th className="py-2 pr-4 text-right font-medium">Katıldı / Toplam</th>
                        <th className="py-2 pr-4 text-right font-medium">Gelmedi</th>
                        <th className="py-2 text-right font-medium">Oran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.low_attendance.map((s) => (
                        <tr key={s.student_id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{s.name}</td>
                          <td className="py-2 pr-4 text-right">
                            {s.present} / {s.total}
                          </td>
                          <td className="py-2 pr-4 text-right">{s.absent}</td>
                          <td className="py-2 text-right font-medium text-red-700">%{pct(s.present, s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )
      ) : null}
    </div>
  );
}

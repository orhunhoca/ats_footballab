import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { parentService } from "@/services/parentService";
import { analyzeStudentTests, buildParentSummary, formatNumber, formatUnit, type AnalysisTestRecord } from "@/lib/performanceAnalysis";

const TREND: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  improving: { label: "Gelişiyor", variant: "default" },
  declining: { label: "Geriledi", variant: "destructive" },
  stable: { label: "İstikrarlı", variant: "secondary" },
  single: { label: "İlk ölçüm", variant: "secondary" },
};

/** Çocuğun performans test sonuçları ve kısa değerlendirmesi (antrenör notları gösterilmez). */
export function ChildPerformanceCard({ studentId }: { studentId: string }) {
  const [tests, setTests] = useState<AnalysisTestRecord[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    parentService
      .getChildPerformance(studentId)
      .then((t) => alive && setTests(t))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [studentId]);

  const analysis = useMemo(() => (tests ? analyzeStudentTests(tests) : null), [tests]);

  if (error) return <p className="text-sm text-gray-600">Performans bilgileri yüklenemedi.</p>;
  if (!analysis) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />;
  if (analysis.totalTests === 0) return <p className="text-sm text-gray-600">Henüz performans testi yapılmadı.</p>;

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-md bg-emerald-50 p-3">
        <p className="mb-1 font-semibold text-emerald-900">Değerlendirme</p>
        <p>{buildParentSummary(analysis)}</p>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold">Test sonuçları</h4>
        {analysis.metrics.map((m) => {
          const t = TREND[m.trend];
          return (
            <div key={m.key} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="min-w-0">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-gray-600">
                  Son: {formatNumber(m.latest)} {formatUnit(m.unit)} · {new Date(m.latestDate).toLocaleDateString("tr-TR")}
                  {m.count > 1 && ` · ilk: ${formatNumber(m.first)} · en iyi: ${formatNumber(m.best)}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={t.variant}>{t.label}</Badge>
                {m.changePct !== null && m.trend !== "stable" && m.trend !== "single" && (
                  <span className="text-xs text-gray-600">%{formatNumber(Math.abs(m.changePct))}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Bu değerlendirme yalnızca okulda kaydedilen ölçümlere dayanır; tıbbi değerlendirme yerine geçmez.</p>
    </div>
  );
}

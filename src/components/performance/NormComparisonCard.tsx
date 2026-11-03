import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { formatNumber, formatUnit, type StudentAnalysis } from "@/lib/performanceAnalysis";
import { NORM_LEVEL_LABEL, NORM_SOURCE_LABEL, type NormLevel } from "@/lib/testNorms";

const LEVEL_STYLE: Record<NormLevel, string> = {
  developing: "bg-amber-100 text-amber-800 border-amber-200",
  average: "bg-slate-100 text-slate-700 border-slate-200",
  good: "bg-emerald-100 text-emerald-800 border-emerald-200",
  excellent: "bg-emerald-600 text-white border-emerald-600",
};

/** Çocuğun son ölçümünün yaş grubundaki konumu (norm çubuğu + seviye) */
export function NormComparisonCard({ analysis, age }: { analysis: StudentAnalysis; age?: number | null }) {
  const rows = analysis.metrics.filter((m) => m.norm);
  if (rows.length === 0) return null;
  const hasSchool = rows.some((m) => m.norm?.ref.source === "okul");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Yaş Grubuna Göre Konum{age ? ` (${age} yaş)` : ""}
        </CardTitle>
        <CardDescription>
          Son ölçümün aynı yaştaki çocuklara göre durumu. Kaynak: {hasSchool ? "okulun kendi ölçümleri (yeterli veri olan testlerde), diğerlerinde" : ""} yaklaşık başlangıç referansı —
          bilimsel norm tablosu değildir; okulda ölçüm arttıkça okul ortalaması esas alınır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((m) => {
          const n = m.norm!;
          const lo = Math.min(n.ref.weak, n.ref.strong, m.latest);
          const hi = Math.max(n.ref.weak, n.ref.strong, m.latest);
          const span = hi - lo || 1;
          // Konum çubuğu daima "sağ = daha iyi"
          const posRaw = ((m.latest - lo) / span) * 100;
          const pos = Math.max(2, Math.min(98, m.direction === "lower" ? 100 - posRaw : posRaw));
          const medianRaw = ((n.ref.median - lo) / span) * 100;
          const median = m.direction === "lower" ? 100 - medianRaw : medianRaw;
          return (
            <div key={m.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-medium text-sm">
                  {m.name}{" "}
                  <span className="text-muted-foreground font-normal">
                    {formatNumber(m.latest)} {formatUnit(m.unit)}
                  </span>
                </div>
                <Badge variant="outline" className={LEVEL_STYLE[n.level]}>
                  {NORM_LEVEL_LABEL[n.level]}
                </Badge>
              </div>
              <div className="relative h-2.5 rounded-full bg-gradient-to-r from-amber-200 via-slate-200 to-emerald-300">
                <div className="absolute top-[-2px] h-[14px] w-px bg-slate-500" style={{ left: `${median}%` }} title="Ortanca" />
                <div className="absolute top-[-3px] h-4 w-4 -ml-2 rounded-full border-2 border-white bg-emerald-700 shadow" style={{ left: `${pos}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Ortanca {formatNumber(n.ref.median)} {formatUnit(m.unit)} · {NORM_SOURCE_LABEL[n.ref.source]}
                {n.ref.n ? ` (${n.ref.n} öğrenci)` : ""}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

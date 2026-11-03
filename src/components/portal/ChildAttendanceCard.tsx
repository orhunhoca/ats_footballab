import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { parentService, type ChildAttendance } from "@/services/parentService";

const STATUS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  present: { label: "Katıldı", variant: "default" },
  absent: { label: "Gelmedi", variant: "destructive" },
  excused: { label: "Mazeretli", variant: "secondary" },
};

/** Çocuğun yoklama özeti ve son kayıtları (yalnızca görüntüleme). */
export function ChildAttendanceCard({ studentId }: { studentId: string }) {
  const [data, setData] = useState<ChildAttendance | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    parentService
      .getChildAttendance(studentId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [studentId]);

  if (error) return <p className="text-sm text-gray-600">Yoklama bilgileri yüklenemedi.</p>;
  if (!data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />;
  if (data.total === 0) return <p className="text-sm text-gray-600">Henüz yoklama kaydı yok.</p>;

  const rate = Math.round((data.present / data.total) * 100);
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border p-2">
          <p className="text-xs text-gray-600">Katılım oranı</p>
          <p className="font-semibold text-emerald-700">%{rate}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-xs text-gray-600">Katıldı</p>
          <p className="font-semibold">{data.present}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-xs text-gray-600">Gelmedi</p>
          <p className="font-semibold">{data.absent}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-xs text-gray-600">Mazeretli</p>
          <p className="font-semibold">{data.excused}</p>
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold">Son yoklamalar</h4>
        {data.records.map((r, i) => {
          const st = STATUS[r.status] ?? { label: r.status, variant: "secondary" as const };
          return (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <span>
                {new Date(r.date).toLocaleDateString("tr-TR")}
                {r.group_name ? <span className="text-gray-600"> · {r.group_name}</span> : null}
              </span>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

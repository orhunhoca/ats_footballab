import { Badge } from "@/components/ui/badge";
import { KIND_LABELS, type DrillKind } from "@/lib/training/drills";

export interface DrillLike {
  name: string;
  kind: DrillKind | string;
  goal?: string | null;
  setup?: string | null;
  how: string[];
  points: string[];
  easier?: string | null;
  harder?: string | null;
  materials: string[];
  players?: string | null;
}

/** Egzersiz ayrıntısı: amaç, düzen, nasıl oynanır, ipuçları, kolaylaştır/zorlaştır, malzeme. */
export function DrillView({ drill, compact = false }: { drill: DrillLike; compact?: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      {drill.goal && (
        <p>
          <span className="font-semibold text-emerald-800">Amaç: </span>
          {drill.goal}
        </p>
      )}
      {drill.setup && (
        <p>
          <span className="font-semibold">Düzen: </span>
          {drill.setup}
        </p>
      )}
      {drill.how.length > 0 && (
        <div>
          <p className="font-semibold">Nasıl oynanır</p>
          <ol className="ml-5 list-decimal space-y-0.5">
            {drill.how.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </div>
      )}
      {drill.points.length > 0 && (
        <div>
          <p className="font-semibold">Antrenör ipuçları</p>
          <ul className="ml-5 list-disc space-y-0.5">
            {drill.points.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      {!compact && (drill.easier || drill.harder) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {drill.easier && (
            <div className="rounded-md bg-blue-50 p-2">
              <p className="text-xs font-semibold text-blue-800">Kolaylaştır</p>
              <p>{drill.easier}</p>
            </div>
          )}
          {drill.harder && (
            <div className="rounded-md bg-amber-50 p-2">
              <p className="text-xs font-semibold text-amber-800">Zorlaştır</p>
              <p>{drill.harder}</p>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {drill.players && <Badge variant="outline">👥 {drill.players}</Badge>}
        <Badge variant="secondary">{KIND_LABELS[drill.kind as DrillKind] ?? drill.kind}</Badge>
        {drill.materials.map((m) => (
          <Badge key={m} variant="outline" className="font-normal">
            {m}
          </Badge>
        ))}
      </div>
    </div>
  );
}

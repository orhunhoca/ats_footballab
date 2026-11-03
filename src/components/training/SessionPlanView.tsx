import { Clock, Package, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { SessionPlan } from "@/lib/training/curriculum";
import { DrillView } from "./DrillView";

const PHASE_STYLE: Record<string, string> = {
  Isınma: "bg-amber-100 text-amber-800",
  "Konu çalışması": "bg-emerald-100 text-emerald-800",
  Oyun: "bg-blue-100 text-blue-800",
  Soğuma: "bg-slate-100 text-slate-700",
};

/** Bir seansın (60 dk) basitleştirilmiş planı: özet, malzeme listesi ve dakika dakika akış. */
export function SessionPlanView({ plan }: { plan: SessionPlan }) {
  let elapsed = 0;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{plan.emphasis}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
          <Clock className="h-4 w-4 text-emerald-600" />
          <span>
            <strong>{plan.duration} dk</strong> toplam süre
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
          <Users className="h-4 w-4 text-emerald-600" />
          <span>{plan.players}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
          <Package className="h-4 w-4 text-emerald-600" />
          <span>{plan.materials.length} çeşit malzeme</span>
        </div>
      </div>

      <div className="rounded-md bg-gray-50 p-3 text-sm">
        <p className="mb-1 font-semibold">Malzeme listesi</p>
        <ul className="grid gap-x-4 sm:grid-cols-2">
          {plan.materials.map((m) => (
            <li key={m} className="list-inside list-disc">
              {m}
            </li>
          ))}
        </ul>
      </div>

      <Accordion type="multiple" className="rounded-md border px-3">
        {plan.blocks.map((b, i) => {
          const start = elapsed;
          elapsed += b.minutes;
          return (
            <AccordionItem key={i} value={`b${i}`}>
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                  <span className="w-16 shrink-0 text-xs font-medium text-gray-500">
                    {start}–{elapsed} dk
                  </span>
                  <div className="min-w-0">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${PHASE_STYLE[b.phase]}`}>{b.phase}</span>
                    <span className="text-sm font-semibold">{b.drill.name}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {b.rule && (
                  <div className="mb-3 rounded-md border-l-4 border-emerald-500 bg-emerald-50 p-2 text-sm">
                    <span className="font-semibold">Bu haftanın kuralı: </span>
                    {b.rule}
                  </div>
                )}
                <DrillView drill={b.drill} />
                <Badge variant="outline" className="mt-3">
                  {b.minutes} dakika
                </Badge>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

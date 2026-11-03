import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PERIOD_LABELS, periodRange, type PeriodKey } from "@/services/reportService";

const today = () => new Date().toISOString().slice(0, 10);

/** Dönem durumu + seçici: son 7 gün, bu ay, geçen ay, son 90 gün, özel aralık. */
export function usePeriod(initial: PeriodKey = "thisMonth") {
  const [period, setPeriod] = useState<PeriodKey>(initial);
  const [customFrom, setCustomFrom] = useState(() => periodRange("thisMonth").from);
  const [customTo, setCustomTo] = useState(today);
  const range = period === "custom" ? { from: customFrom, to: customTo } : periodRange(period);
  const valid = !!range.from && !!range.to && range.to >= range.from;
  return { period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo, range, valid };
}

export type PeriodState = ReturnType<typeof usePeriod>;

export function PeriodPicker({ state }: { state: PeriodState }) {
  return (
    <>
      <div className="space-y-1">
        <Label>Dönem</Label>
        <Select value={state.period} onValueChange={(v) => state.setPeriod(v as PeriodKey)}>
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
      {state.period === "custom" && (
        <>
          <div className="space-y-1">
            <Label htmlFor="per-from">Başlangıç</Label>
            <Input id="per-from" type="date" value={state.customFrom} max={state.customTo} onChange={(e) => state.setCustomFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="per-to">Bitiş</Label>
            <Input id="per-to" type="date" value={state.customTo} min={state.customFrom} onChange={(e) => state.setCustomTo(e.target.value)} />
          </div>
        </>
      )}
    </>
  );
}

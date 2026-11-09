import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface FieldDraft {
  name: string;
  open_time: string;
  close_time: string;
  /** boş bırakılabilir görünür ama kaydetmek için zorunlu */
  capacity: string;
}

export const newFieldDraft = (n: number): FieldDraft => ({ name: `Saha ${n}`, open_time: "09:00", close_time: "21:00", capacity: "" });

/** Saha satırları: ad, çalışma saatleri, 1 saatlik öğrenci kontenjanı (zorunlu) */
export function FieldRows({
  rows,
  onChange,
  onRemove,
}: {
  rows: FieldDraft[];
  onChange: (index: number, patch: Partial<FieldDraft>) => void;
  onRemove?: (index: number) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="rounded-md border p-3 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Saha adı *</Label>
              <Input value={r.name} onChange={(e) => onChange(i, { name: e.target.value })} placeholder={`Saha ${i + 1}`} />
            </div>
            {onRemove && rows.length > 1 && (
              <Button type="button" variant="ghost" size="icon" aria-label="Sahayı kaldır" onClick={() => onRemove(i)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Açılış *</Label>
              <Input type="time" value={r.open_time} onChange={(e) => onChange(i, { open_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kapanış *</Label>
              <Input type="time" value={r.close_time} onChange={(e) => onChange(i, { close_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kontenjan *</Label>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={r.capacity}
                placeholder="öğrenci/saat"
                onChange={(e) => onChange(i, { capacity: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Kontenjan: sahada aynı anda (1 saatlik antrenmanda) bulunabilecek en çok öğrenci sayısıdır. Sahadaki gruplar bu sayıyı aşamaz; dolunca o sahaya yeni deneme öğrencisi alınmaz ve sistem uyarır.
      </p>
    </div>
  );
}

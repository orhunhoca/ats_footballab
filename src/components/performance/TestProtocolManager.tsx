import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Power, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { settingsService, type TestProtocol } from "@/services/settingsService";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { measureTypeDef, skillColor, skillLabel, SKILLS } from "@/lib/testCatalog";
import { TestProtocolDialog } from "./TestProtocolDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Test eklendi/düzenlendi/pasife alındı → üst bileşen listeyi yeniler */
  onChanged: () => void;
}

/** Tüm testler: beceriye göre gruplu liste, yeni test ekleme, kendi testini düzenleme/pasife alma */
export function TestProtocolManager({ open, onOpenChange, onChanged }: Props) {
  const { toast } = useToast();
  const { isManagement } = useUserRole();
  const [items, setItems] = useState<TestProtocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TestProtocol | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await settingsService.getAllTestProtocols());
    } catch {
      toast({ title: "Hata", description: "Testler yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    load();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [open, load]);

  const canEdit = (p: TestProtocol) => isManagement || (!!userId && p.created_by === userId);

  const toggleActive = async (p: TestProtocol) => {
    try {
      await settingsService.updateTestProtocol(p.id, { is_active: !p.is_active });
      toast({ title: p.is_active ? "Test pasife alındı" : "Test yeniden etkinleştirildi", description: p.name });
      await load();
      onChanged();
    } catch {
      toast({ title: "Hata", description: "İşlem yapılamadı.", variant: "destructive" });
    }
  };

  const grouped = SKILLS.map((s) => ({ skill: s, rows: items.filter((p) => p.category === s.value) })).filter((g) => g.rows.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performans Testleri</DialogTitle>
            <DialogDescription>
              Okuldaki tüm testler. Yeni test tanımlayabilir, kendi eklediğiniz testleri düzenleyebilirsiniz (yönetim hepsini düzenler).
            </DialogDescription>
          </DialogHeader>

          <div>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Yeni Test Tanımla
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ skill, rows }) => (
                <div key={skill.value}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{skill.label}</h3>
                  <div className="space-y-2">
                    {rows.map((p) => (
                      <div key={p.id} className={`flex items-center gap-3 rounded-md border p-3 ${p.is_active ? "" : "opacity-60"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{p.name}</span>
                            <Badge variant="secondary" className={skillColor(p.category)}>
                              {skillLabel(p.category)}
                            </Badge>
                            {!p.is_active && <Badge variant="outline">Pasif</Badge>}
                            {p.created_by && userId && p.created_by === userId && <Badge variant="outline">Sizin</Badge>}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {measureTypeDef(p.measure_type)?.label ?? "Ölçüm"} · {p.unit} ·{" "}
                            {p.direction === "lower" ? "küçük değer iyi" : p.direction === "higher" ? "büyük değer iyi" : "yön otomatik"}
                          </p>
                          {p.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                        </div>
                        {canEdit(p) && (
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Düzenle"
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={p.is_active ? "Pasife al" : "Etkinleştir"} onClick={() => toggleActive(p)}>
                              {p.is_active ? <Power className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Henüz test tanımlı değil.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TestProtocolDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        protocol={editing}
        onSaved={() => {
          load();
          onChanged();
        }}
      />
    </>
  );
}

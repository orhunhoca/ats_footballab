import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { TemplateEditorDialog } from "@/components/notifications/TemplateEditorDialog";
import { whatsappService } from "@/services/whatsappService";
import { templateService, type WaTemplate } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";
import { toEditorText, previewText } from "@/lib/reminderVars";

const TYPE_LABEL: Record<string, string> = {
  payment_reminder: "Bakiye / ödeme hatırlatması",
  clothing_reminder: "Kıyafet ücreti hatırlatması",
  health_report_reminder: "Sağlık raporu hatırlatması",
  registration_form_reminder: "Kayıt formu hatırlatması",
  trial_reminder: "Deneme antrenmanı hatırlatması",
  attendance_notification: "Yoklama bildirimi",
  general_announcement: "Genel duyuru",
  performance_report: "Performans raporu",
  performance_report_pdf: "Performans raporu (PDF)",
  custom: "Özel mesaj",
};

const statusBadge = (s: string | null) =>
  s === "approved" ? <Badge className="bg-emerald-600">Meta'da onaylı</Badge> : s === "rejected" ? <Badge variant="destructive">Reddedildi</Badge> : <Badge variant="outline">Onay bekliyor</Badge>;

/** Tüm WhatsApp şablonları tek yerde: sistem şablonları (düzenle) + özel mesajlar (ekle / düzenle / sil). Bildirim Merkezi bunları kullanır. */
export function MessageTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);

  const load = useCallback(async () => {
    setTemplates((await whatsappService.getTemplates()) as WaTemplate[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const edit = (t: WaTemplate | null) => {
    setEditing(t);
    setOpen(true);
  };
  const remove = async (t: WaTemplate) => {
    if (!window.confirm(`"${t.template_name}" mesajı silinsin mi?`)) return;
    try {
      await templateService.remove(t.id);
      toast({ title: "Mesaj silindi" });
      load();
    } catch {
      toast({ title: "Silinemedi", variant: "destructive" });
    }
  };

  const system = templates.filter((t) => t.template_type !== "custom");
  const custom = templates.filter((t) => t.template_type === "custom");

  const Item = ({ t, deletable }: { t: WaTemplate; deletable?: boolean }) => (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{deletable ? t.template_name : TYPE_LABEL[t.template_type ?? ""] ?? t.template_name}</span>
          {statusBadge(t.status)}
        </div>
        <p className="text-[11px] text-muted-foreground">Meta adı: <code>{t.template_id ?? "— (tanımlanmadı)"}</code></p>
        <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">{previewText(toEditorText(t.message_content, Array.isArray(t.variables) ? (t.variables as string[]) : []))}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="outline" onClick={() => edit(t)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Düzenle
        </Button>
        {deletable && (
          <Button size="icon" variant="ghost" aria-label="Sil" onClick={() => remove(t)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
    </li>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Mesaj Şablonları</CardTitle>
          <CardDescription>
            Velilere giden tüm WhatsApp şablonları burada. Bildirimler sayfasındaki hatırlatmalar ve "Kullanılacak şablon" seçimi bu listeyi kullanır. Metni değiştirirseniz Meta'da da aynı adla güncelleyip onaylatın.
          </CardDescription>
        </div>
        <Button onClick={() => edit(null)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-1.5 h-4 w-4" /> Yeni mesaj ekle
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <>
            <div>
              <p className="mb-1 text-sm font-semibold">Özel mesajlarım</p>
              {custom.length === 0 ? (
                <p className="text-xs text-muted-foreground">Henüz özel mesaj yok. "Yeni mesaj ekle" ile kendi bildirim metninizi oluşturun; Bildirimler sayfasında listelerin başındaki "Kullanılacak şablon" kutusundan seçip gönderebilirsiniz.</p>
              ) : (
                <ul className="divide-y">{custom.map((t) => <Item key={t.id} t={t} deletable />)}</ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Hazır (sistem) şablonlar</p>
              <ul className="divide-y">{system.map((t) => <Item key={t.id} t={t} />)}</ul>
            </div>
          </>
        )}
      </CardContent>
      <TemplateEditorDialog open={open} onOpenChange={setOpen} template={editing} onSaved={load} />
    </Card>
  );
}

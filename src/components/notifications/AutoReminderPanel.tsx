import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Loader2, PlayCircle, Eye, Pencil } from "lucide-react";
import { TemplateEditorDialog } from "@/components/notifications/TemplateEditorDialog";
import { type WaTemplate } from "@/services/templateService";
import { reminderService, type ReminderRule, type RuleType } from "@/services/reminderService";
import { useToast } from "@/hooks/use-toast";

const LABEL: Record<RuleType, { title: string; desc: string; template: string }> = {
  balance: { title: "Bakiye borcu", desc: "Vadesi geçmiş ya da yaklaşan borcu olan öğrencilerin velilerine; veli adı, öğrenci adı, bakiye ve vade tarihi otomatik doldurulur.", template: "payment_reminder" },
  clothing: { title: "Kıyafet ücreti ödenmemiş", desc: "Yazlık/kışlık kıyafet ücreti ödenmemiş öğrencilerin velilerine.", template: "clothing_reminder" },
  health_report: { title: "Sağlık raporu eksik", desc: "Sağlık raporu teslim edilmemiş öğrencilerin velilerine.", template: "health_report_reminder" },
  registration_form: { title: "Kayıt formu eksik", desc: "Kayıt formu teslim edilmemiş öğrencilerin velilerine.", template: "registration_form_reminder" },
  trial_lesson: { title: "Deneme antrenmanı", desc: "Deneme öğrencisinin velisine, antrenmandan önce grup, gün/saat ve saha bilgisiyle.", template: "trial_reminder" },
};

type Preview = Awaited<ReturnType<typeof reminderService.run>>;

/** Otomatik hatırlatma kuralları: aç/kapat, gün ayarları, önizleme ve "şimdi gönder" */
export function AutoReminderPanel({ isAdmin, whatsappActive, templates, onTemplatesChanged }: { isAdmin: boolean; whatsappActive: boolean; templates: WaTemplate[]; onTemplatesChanged: () => void }) {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const openEditor = (t: WaTemplate | null) => {
    setEditing(t);
    setEditorOpen(true);
  };
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"preview" | "send" | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = async () => {
    try {
      setRules(await reminderService.getRules());
    } catch {
      toast({ title: "Hata", description: "Hatırlatma kuralları yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (type: RuleType, patch: Partial<Pick<ReminderRule, "enabled" | "days_before" | "repeat_days">>) => {
    setRules((prev) => prev.map((r) => (r.rule_type === type ? { ...r, ...patch } : r)));
    try {
      await reminderService.updateRule(type, patch);
    } catch {
      toast({ title: "Kaydedilemedi", description: "Ayar değiştirilemedi (yalnız admin değiştirebilir).", variant: "destructive" });
      await load();
    }
  };

  const run = async (mode: "preview" | "send") => {
    if (mode === "send" && !window.confirm("Açık kurallara göre hatırlatma mesajları şimdi gönderilecek. Devam edilsin mi?")) return;
    setBusy(mode);
    try {
      const res = await reminderService.run(mode);
      setPreview(res);
      if (mode === "send") toast({ title: res.whatsapp_active ? "Gönderim tamamlandı" : "Gönderilemedi", description: res.whatsapp_active ? `${res.sent} mesaj gönderildi, ${res.failed} başarısız.` : res.note ?? "WhatsApp bağlı değil." });
    } catch (e) {
      toast({ title: "Hata", description: e instanceof Error ? e.message : "İşlem yapılamadı", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Otomatik Hatırlatmalar</CardTitle>
        <CardDescription>
          Açtığınız hatırlatmalar her gün saat 09:00'da (Türkiye saati) onaylı WhatsApp şablonlarıyla velilere kendiliğinden gider; ad, öğrenci ve bakiye bilgileri sistem tarafından doldurulur.
          Aynı veliye aynı hatırlatma ayarladığınız gün sayısı dolmadan tekrar gitmez.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!whatsappActive && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              WhatsApp henüz bağlı değil: kurallar kaydedilir ama mesaj gönderilmez. Ayarlar → WhatsApp'tan bağlayıp etkinleştirdiğinizde gönderim otomatik başlar. Önizleme her zaman çalışır.
            </AlertDescription>
          </Alert>
        )}
        {!isAdmin && <p className="text-xs text-muted-foreground">Kuralları yalnız admin değiştirebilir; önizleme ve gönderimi yönetim kullanabilir.</p>}

        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-3">
            {rules.map((r) => {
              const t = r.rule_type as RuleType;
              const meta = LABEL[t];
              return (
                <div key={t} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{meta.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.desc}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">Şablon: <code>{meta.template}</code></p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {isAdmin && (
                        <Button variant="outline" size="sm" onClick={() => openEditor(templates.find((x) => x.template_type === meta.template) ?? null)} disabled={!templates.some((x) => x.template_type === meta.template)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Düzenle
                        </Button>
                      )}
                      <Switch checked={r.enabled} disabled={!isAdmin} onCheckedChange={(v) => update(t, { enabled: v })} aria-label={`${meta.title} otomatik gönderim`} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    {(t === "balance" || t === "trial_lesson") && (
                      <label className="flex items-center gap-2">
                        {t === "balance" ? "Vadesine en çok" : "Deneme tarihinden"}
                        <Input type="number" min={0} max={60} className="w-16" disabled={!isAdmin} value={r.days_before ?? ""} onChange={(e) => update(t, { days_before: e.target.value === "" ? null : Number(e.target.value) })} />
                        {t === "balance" ? "gün kala (ve gecikenlere)" : "gün önce"}
                      </label>
                    )}
                    {t !== "trial_lesson" && (
                      <label className="flex items-center gap-2">
                        Tekrar:
                        <Input type="number" min={1} max={90} className="w-16" disabled={!isAdmin} value={r.repeat_days ?? ""} onChange={(e) => update(t, { repeat_days: e.target.value === "" ? null : Number(e.target.value) })} />
                        günde bir
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Yeni mesaj eklemek ve tüm şablonları yönetmek için: <Link href="/settings" className="underline">Ayarlar → Otomatik Mesajlar → Mesaj Şablonları</Link>. Özel mesajlarınız Bildirim Merkezi listelerinde "Kullanılacak şablon" kutusundan seçilir.
        </p>

        <TemplateEditorDialog open={editorOpen} onOpenChange={setEditorOpen} template={editing} onSaved={onTemplatesChanged} />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => run("preview")} disabled={!!busy}>
            {busy === "preview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Önizleme (kime ne gider?)
          </Button>
          <Button onClick={() => run("send")} disabled={!!busy || !whatsappActive || enabledCount === 0} className="bg-emerald-600 hover:bg-emerald-700">
            {busy === "send" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Açık kuralları şimdi gönder
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 rounded-md border bg-slate-50 p-3">
            <p className="text-sm font-medium">{preview.mode === "preview" ? "Önizleme" : "Gönderim sonucu"}</p>
            {preview.rules.map((r) => (
              <div key={r.rule_type}>
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {LABEL[r.rule_type].title}
                  <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "Açık" : "Kapalı"}</Badge>
                  <span className="font-normal text-muted-foreground">{r.planned} gidecek · {r.skipped} atlanacak</span>
                </p>
                {r.items.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {r.items.map((it, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-1.5">
                        {it.result === "sent" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : null}
                        <strong>{it.student_name}</strong>
                        <span className="text-muted-foreground">
                          → {it.recipient_name}
                          {it.phone ? ` (+${it.phone})` : ""}
                          {it.variables.amount ? ` · ${it.variables.amount} TL, vade ${it.variables.payment_date}` : ""}
                          {it.variables.trial_date ? ` · ${it.variables.trial_date} · ${it.variables.group_info}` : ""}
                        </span>
                        {it.status === "skipped" && <Badge variant="outline">{it.reason}</Badge>}
                        {it.result === "failed" && <Badge variant="destructive">{it.error ?? "başarısız"}</Badge>}
                        {it.result === "not_sent" && <Badge variant="outline">{it.error}</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { SEO } from "@/components/SEO";
import { BranchFilterBar } from "@/components/BranchFilterBar";
import { RoleGate } from "@/components/RoleGate";
import { Navigation } from "@/components/Navigation";
import { useBranch } from "@/contexts/BranchContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CalendarClock,
  FileHeart,
  FileText,
  Loader2,
  MessageCircle,
  Phone,
  Shirt,
  ShieldCheck,
  Timer,
  Users,
  Wallet,
  Send,
} from "lucide-react";
import { reminderService, type Overview, type ParentContact } from "@/services/reminderService";
import { whatsappService } from "@/services/whatsappService";
import { AutoReminderPanel } from "@/components/notifications/AutoReminderPanel";
import { useToast } from "@/hooks/use-toast";
import type { WaTemplate } from "@/services/templateService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = "trials" | "debts" | "clothing" | "health" | "form" | "kvkk" | "expiry";

interface Row {
  key: string;
  title: string;
  detail: string;
  badge?: { text: string; tone: "red" | "amber" | "gray" };
  studentId: string | null;
  contacts: ParentContact[];
  /** WhatsApp şablonu + değişkenleri (null: bu kategoride şablonlu gönderim yok) */
  template: { type: string; variables: Record<string, string> } | null;
}

const fmtMoney = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");

/** Şablon gövdesindeki {{n}} yerlerini değişkenlerle doldurur (önizleme / wa.me metni) */
function fillBody(body: string, order: string[], vars: Record<string, string>) {
  let out = body;
  order.forEach((k, i) => (out = out.replace(`{{${i + 1}}}`, vars[k] ?? "")));
  return out;
}

const CATEGORIES: { id: Category; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "trials", label: "Bu hafta deneme", icon: CalendarClock, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { id: "debts", label: "Bakiye borcu", icon: Wallet, color: "text-red-700 bg-red-50 border-red-200" },
  { id: "clothing", label: "Kıyafet ücreti ödenmemiş", icon: Shirt, color: "text-teal-700 bg-teal-50 border-teal-200" },
  { id: "health", label: "Sağlık raporu eksik", icon: FileHeart, color: "text-orange-700 bg-orange-50 border-orange-200" },
  { id: "form", label: "Kayıt formu eksik", icon: FileText, color: "text-amber-700 bg-amber-50 border-amber-200" },
  { id: "kvkk", label: "KVKK onayı eksik", icon: ShieldCheck, color: "text-purple-700 bg-purple-50 border-purple-200" },
  { id: "expiry", label: "Üyeliği bitiyor / bitti", icon: Timer, color: "text-slate-700 bg-slate-50 border-slate-200" },
];

function NotificationsPageInner() {
  const { toast } = useToast();
  const { selectedBranchId } = useBranch();
  const { isAdmin } = useUserRole();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<Category>("debts");
  const [waActive, setWaActive] = useState(false);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [customId, setCustomId] = useState<string>("default");
  const loadTemplates = useCallback(() => {
    whatsappService.getTemplates().then((t) => setTemplates(t as WaTemplate[])).catch(() => undefined);
  }, []);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await reminderService.getOverview(selectedBranchId));
    } catch (e) {
      console.error("Bildirim verisi yüklenemedi:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    whatsappService.getSettings().then((s) => setWaActive(!!s?.is_active));
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<Record<Category, Row[]>>(() => {
    const empty = { trials: [], debts: [], clothing: [], health: [], form: [], kvkk: [], expiry: [] } as Record<Category, Row[]>;
    if (!data) return empty;
    const parents = (m: ParentContact | null, f: ParentContact | null) => [m, f].filter((x): x is ParentContact => !!x);
    const primary = (m: ParentContact | null, f: ParentContact | null) => m ?? f;
    return {
      trials: data.trials.map((t) => ({
        key: t.id,
        title: t.name,
        detail: `${fmtDate(t.trialDate)}${t.groupName ? ` · ${t.groupName}` : " · grup atanmamış"}`,
        badge: t.groupName ? undefined : { text: "Grup yok", tone: "amber" },
        studentId: null,
        contacts: t.parent ? [t.parent] : [],
        template: { type: "trial_reminder", variables: { parent_name: t.parent?.name ?? "Sayın Veli", student_name: t.name, trial_date: fmtDate(t.trialDate), group_info: t.groupName ?? "antrenman saatimizde" } },
      })),
      debts: data.debts.map((d) => ({
        key: d.id,
        title: d.name,
        detail: `Bakiye ${fmtMoney(d.balance)} TL${d.overdue > 0 ? ` · geciken ${fmtMoney(d.overdue)} TL` : ""}${d.earliestDue ? ` · ilk vade ${fmtDate(d.earliestDue)}` : ""}`,
        badge: d.overdue > 0 ? { text: "Gecikmiş", tone: "red" } : undefined,
        studentId: d.id,
        contacts: parents(d.mother, d.father),
        template: { type: "payment_reminder", variables: { parent_name: primary(d.mother, d.father)?.name ?? "Sayın Veli", student_name: d.name, payment_date: d.earliestDue ? fmtDate(d.earliestDue) : fmtDate(new Date().toISOString()), amount: fmtMoney(d.balance) } },
      })),
      clothing: data.clothing.map((c) => ({
        key: c.id,
        title: c.name,
        detail: `${c.items.join(" + ")} kıyafet ücreti ödenmemiş${c.amount ? ` · ${fmtMoney(c.amount)} TL` : ""}`,
        studentId: c.id,
        contacts: parents(c.mother, c.father),
        template: { type: "clothing_reminder", variables: { parent_name: primary(c.mother, c.father)?.name ?? "Sayın Veli", student_name: c.name, clothing_info: `${c.items.join(" + ")} kıyafet`, amount: c.amount ? fmtMoney(c.amount) : "-" } },
      })),
      health: data.healthMissing.map((s) => ({
        key: s.id, title: s.name, detail: "Sağlık raporu teslim edilmemiş", studentId: s.id, contacts: parents(s.mother, s.father),
        template: { type: "health_report_reminder", variables: { parent_name: primary(s.mother, s.father)?.name ?? "Sayın Veli", student_name: s.name } },
      })),
      form: data.formMissing.map((s) => ({
        key: s.id, title: s.name, detail: "Kayıt formu teslim edilmemiş", studentId: s.id, contacts: parents(s.mother, s.father),
        template: { type: "registration_form_reminder", variables: { parent_name: primary(s.mother, s.father)?.name ?? "Sayın Veli", student_name: s.name } },
      })),
      kvkk: data.kvkkMissing.map((s) => ({ key: s.id, title: s.name, detail: "KVKK aydınlatma onayı alınmamış", studentId: s.id, contacts: parents(s.mother, s.father), template: null })),
      expiry: data.expiring.map((s) => ({
        key: s.id,
        title: s.name,
        detail: s.daysLeft < 0 ? `Üyelik ${-s.daysLeft} gün önce bitti (${fmtDate(s.endDate)})` : `Üyelik ${s.daysLeft} gün sonra bitiyor (${fmtDate(s.endDate)})`,
        badge: s.daysLeft < 0 ? { text: "Bitti", tone: "red" } : s.daysLeft <= 7 ? { text: "7 gün içinde", tone: "amber" } : undefined,
        studentId: s.id,
        contacts: parents(s.mother, s.father),
        template: null,
      })),
    };
  }, [data]);

  const counts: Record<Category, number> = {
    trials: rows.trials.length,
    debts: rows.debts.length,
    clothing: rows.clothing.length,
    health: rows.health.length,
    form: rows.form.length,
    kvkk: rows.kvkk.length,
    expiry: rows.expiry.length,
  };
  const totalDebt = data?.debts.reduce((s, d) => s + d.balance, 0) ?? 0;
  const overdueCount = data?.debts.filter((d) => d.overdue > 0).length ?? 0;

  const messageText = (row: Row): string => {
    if (!row.template) return `Merhaba ${row.contacts[0]?.name ?? ""}, ${row.title} ile ilgili bilgilendirme: ${row.detail}.\n\nFootbalLab Futbol Okulu`;
    const t = templates.find((x) => (x.template_type === "custom" ? x.template_id : x.template_type) === row.template!.type);
    const order = Array.isArray(t?.variables) ? (t!.variables as string[]) : Object.keys(row.template.variables);
    return t?.message_content ? fillBody(t.message_content, order, row.template.variables) : Object.values(row.template.variables).join(" · ");
  };

  const sendOne = async (row: Row, contact: ParentContact) => {
    const id = `${row.key}-${contact.phone}`;
    if (!waActive || !row.template) {
      // WhatsApp bağlı değil (ya da şablonsuz kategori): kişisel WhatsApp bağlantısıyla elle gönder
      const digits = contact.phone.replace(/\D/g, "");
      const phone = digits.startsWith("90") ? digits : digits.startsWith("0") ? `9${digits}` : `90${digits}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageText(row))}`, "_blank");
      return;
    }
    setSending(id);
    const res = await whatsappService.sendMessage({
      phoneNumber: contact.phone,
      templateName: row.template.type,
      variables: row.template.variables,
      studentId: row.studentId ?? undefined,
      recipientName: contact.name,
      messagePreview: messageText(row),
      messageType: "custom",
    });
    setSending(null);
    toast({ title: res.success ? "Hatırlatma gönderildi" : "Gönderilemedi", description: res.success ? `${row.title} — ${contact.name}` : res.error, variant: res.success ? "default" : "destructive" });
  };

  const sendAll = async (list: Row[]) => {
    const targets = list.filter((r) => r.template && r.contacts.length > 0);
    if (targets.length === 0) return;
    if (!window.confirm(`${targets.length} kişiye hatırlatma mesajı gönderilecek. Devam edilsin mi?`)) return;
    setSending("all");
    let ok = 0;
    let fail = 0;
    for (const r of targets) {
      const res = await whatsappService.sendMessage({
        phoneNumber: r.contacts[0].phone,
        templateName: r.template!.type,
        variables: r.template!.variables,
        studentId: r.studentId ?? undefined,
        recipientName: r.contacts[0].name,
        messagePreview: messageText(r),
        messageType: "custom",
      });
      if (res.success) ok++;
      else fail++;
    }
    setSending(null);
    toast({ title: "Toplu hatırlatma bitti", description: `${ok} gönderildi, ${fail} başarısız.`, variant: fail > 0 ? "destructive" : "default" });
  };

  // Seçili özel şablon varsa liste satırlarının şablonu onunla değişir (veli adı + öğrenci adı + kategoriye özgü bilgiler dolar)
  const customTemplates = templates.filter((t) => t.template_type === "custom" && t.status !== "rejected" && t.template_id);
  const custom = customTemplates.find((t) => t.id === customId) ?? null;
  const list = rows[active].map((r) =>
    custom
      ? { ...r, template: { type: custom.template_id as string, variables: { parent_name: r.contacts[0]?.name ?? "Sayın Veli", student_name: r.title, ...(r.template?.variables ?? {}) } } }
      : r,
  );
  const canSendTemplate = list.some((r) => r.template);

  return (
    <>
      <SEO title="Bildirimler - FootbalLab Futbol Okulu" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto space-y-6 px-4 py-4 sm:py-8">
          <div>
            <h1 className="mb-1 text-2xl font-bold sm:text-3xl">Bildirim Merkezi</h1>
            <p className="text-muted-foreground">Bu hafta ilgilenmeniz gerekenler ve velilere hatırlatmalar</p>
          </div>

          <BranchFilterBar />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Bildirim verileri yüklenemedi. Sayfayı yenileyin.</AlertDescription>
            </Alert>
          )}

          {data && data.fullGroups.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Kontenjanı dolu gruplar:</strong> {data.fullGroups.join(", ")} — bu gruplara yeni deneme öğrencisi alınamaz.
              </AlertDescription>
            </Alert>
          )}

          {/* Özet kartları */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={`rounded-lg border p-3 text-left transition ${c.color} ${active === c.id ? "ring-2 ring-offset-1 ring-current" : "hover:shadow-sm"}`}
                >
                  <Icon className="mb-1 h-5 w-5" />
                  <div className="text-2xl font-bold">{loading ? "…" : counts[c.id]}</div>
                  <div className="text-xs font-medium leading-tight">{c.label}</div>
                  {c.id === "debts" && !loading && counts.debts > 0 && (
                    <div className="mt-1 text-[11px]">
                      Toplam {fmtMoney(totalDebt)} TL{overdueCount > 0 ? ` · ${overdueCount} gecikmiş` : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Liste */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                {CATEGORIES.find((c) => c.id === active)?.label} ({counts[active]})
              </CardTitle>
              {customTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Kullanılacak şablon:</span>
                  <Select value={custom ? custom.id : "default"} onValueChange={(v) => v && setCustomId(v)}>
                    <SelectTrigger className="h-8 w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Varsayılan (kategoriye göre)</SelectItem>
                      {customTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canSendTemplate && list.length > 0 && (
                <Button variant="outline" size="sm" disabled={sending !== null || !waActive} onClick={() => sendAll(list)} title={waActive ? undefined : "WhatsApp bağlandığında toplu gönderim açılır"}>
                  {sending === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Hepsine hatırlat
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                </div>
              ) : list.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Bu başlıkta bekleyen kayıt yok. 🎉</p>
              ) : (
                <div className="divide-y">
                  {list.map((r) => (
                    <div key={r.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{r.title}</span>
                          {r.badge && <Badge variant={r.badge.tone === "red" ? "destructive" : "outline"}>{r.badge.text}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.detail}</p>
                        {r.contacts.length === 0 ? (
                          <p className="text-xs text-red-600">Veli telefonu kayıtlı değil</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{r.contacts.map((c) => `${c.name} (${c.phone})`).join(" · ")}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {r.contacts.map((c) => (
                          <span key={c.phone} className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-700 hover:bg-green-50"
                              disabled={sending !== null}
                              onClick={() => sendOne(r, c)}
                              title={waActive && r.template ? "Şablonla gönder" : "WhatsApp'ta mesajı aç"}
                            >
                              {sending === `${r.key}-${c.phone}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-1.5 h-4 w-4" />}
                              {r.contacts.length > 1 ? c.name.split(" ")[0] : "Hatırlat"}
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`${c.name} ara`} asChild>
                              <a href={`tel:${c.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <AutoReminderPanel isAdmin={isAdmin} whatsappActive={waActive} templates={templates} onTemplatesChanged={loadTemplates} />
        </div>
      </div>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <RoleGate level="management">
      <NotificationsPageInner />
    </RoleGate>
  );
}

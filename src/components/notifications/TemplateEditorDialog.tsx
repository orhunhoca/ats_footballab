import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";
import { TEMPLATE_VARS, fromEditorText, metaBodyProblem, previewText, toEditorText } from "@/lib/reminderVars";
import { templateService, type WaTemplate } from "@/services/templateService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** null → yeni özel şablon */
  template: WaTemplate | null;
  onSaved: () => void;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

/** Bildirim şablonunu düzenle / yeni özel şablon oluştur */
export function TemplateEditorDialog({ open, onOpenChange, template, onSaved }: Props) {
  const { toast } = useToast();
  const isNew = !template;
  const isSystem = !!template && template.template_type !== "custom";
  const [name, setName] = useState("");
  const [metaName, setMetaName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.template_name);
      setMetaName(template.template_id ?? "");
      setText(toEditorText(template.message_content, Array.isArray(template.variables) ? (template.variables as string[]) : []));
      setStatus(template.status ?? "pending");
    } else {
      setName("");
      setMetaName("");
      setText("Merhaba {veli_adi} 👋\n\n{ogrenci_adi} ile ilgili bilgilendirme: ...\n\nFootbalLab Futbol Okulu");
      setStatus("pending");
    }
  }, [open, template]);

  const parsed = fromEditorText(text);
  const problem = parsed.unknown.length ? `Tanınmayan değişken: ${parsed.unknown.join(", ")}` : metaBodyProblem(parsed.body);

  const insert = (token: string) => {
    const el = ref.current;
    const ins = `{${token}}`;
    if (!el) return setText((t) => t + ins);
    const s = el.selectionStart ?? text.length;
    const e = el.selectionEnd ?? text.length;
    setText(text.slice(0, s) + ins + text.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ins.length, s + ins.length);
    });
  };

  const save = async () => {
    const finalMeta = (metaName.trim() || (isNew ? slug(name) : "")).trim();
    if (!name.trim()) return toast({ title: "Eksik bilgi", description: "Şablon adını yazın.", variant: "destructive" });
    if (problem) return toast({ title: "Metni düzeltin", description: problem, variant: "destructive" });
    if (finalMeta && !/^[a-z0-9_]{1,512}$/.test(finalMeta)) return toast({ title: "Meta şablon adı geçersiz", description: "Yalnız küçük harf, rakam ve alt çizgi (_) kullanın.", variant: "destructive" });
    setSaving(true);
    try {
      const input = { template_name: name.trim(), template_id: finalMeta || null, message_content: parsed.body, variables: parsed.variables, status };
      if (template) await templateService.update(template.id, input);
      else await templateService.create(input);
      toast({ title: "Şablon kaydedildi" });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      toast({ title: "Kaydedilemedi", description: /duplicate|unique/i.test(msg) ? "Bu ada sahip bir şablon zaten var." : "Şablonları yalnız admin değiştirebilir.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyMeta = async () => {
    try {
      await navigator.clipboard.writeText(parsed.body);
      toast({ title: "Kopyalandı", description: "Meta Business Manager'da şablon gövdesine yapıştırabilirsiniz." });
    } catch {
      toast({ title: "Kopyalanamadı", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Yeni Bildirim Şablonu" : "Şablonu Düzenle"}</DialogTitle>
          <DialogDescription>Metni yazın, değişkenleri düğmelerle ekleyin; ad ve tutar gibi bilgiler gönderirken sistem tarafından otomatik doldurulur.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Şablon adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Forma teslim hatırlatması" />
            </div>
            <div>
              <Label>Meta'daki şablon adı</Label>
              <Input value={metaName} onChange={(e) => setMetaName(e.target.value.toLowerCase())} placeholder={isNew ? slug(name) || "forma_hatirlatma" : ""} />
              <p className="mt-1 text-[11px] text-muted-foreground">Küçük harf, rakam, alt çizgi. Meta'da oluşturduğunuz adla birebir aynı olmalı.</p>
            </div>
          </div>

          <div>
            <Label>Mesaj metni</Label>
            <Textarea ref={ref} rows={8} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((v) => (
                <Button key={v.key} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => insert(v.token)}>
                  + {v.label}
                </Button>
              ))}
            </div>
            {problem && <p className="mt-2 text-xs text-red-600">{problem}</p>}
          </div>

          <div className="rounded-md border bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Önizleme (örnek bilgilerle)</p>
            <p className="whitespace-pre-wrap text-sm">{previewText(text)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Meta onay durumu</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Onay bekliyor</SelectItem>
                  <SelectItem value="approved">Meta'da onaylandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi (kullanılmaz)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={copyMeta}>
                <Copy className="mr-2 h-4 w-4" /> Meta için metni kopyala
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Önemli:</strong> WhatsApp'ta velilere giden metin, Meta'nın onayladığı metindir. Burada metni değiştirirseniz aynı şablonu Meta Business Manager'da da (aynı adla, yeni metinle) güncelleyip onaylatmanız gerekir; aksi halde velilere eski metin gider.
              {isSystem && " Sistem şablonunda değişkenleri çıkarırsanız ya da yenisini eklerseniz Meta'daki şablonla sayıları uyuşmalıdır."}
              {" "}Meta kuralı: mesaj bir değişkenle başlayamaz/bitemez.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Vazgeç</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

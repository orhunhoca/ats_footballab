import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RotateCcw } from "lucide-react";
import { AUTO_MESSAGES, fillTemplate, unknownVariables, type AutoMessageType } from "@/lib/autoMessages";
import { scheduledMessageService } from "@/services/scheduledMessageService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  type: AutoMessageType | null;
  currentText: string | null;
  onClose: () => void;
  onSaved: (type: AutoMessageType, text: string) => void;
}

/** Otomatik mesajın metnini düzenler; değişken düğmeleri imlece ekler, canlı önizleme gösterir. */
export function AutoMessageEditDialog({ type, currentText, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const def = type ? AUTO_MESSAGES[type] : null;

  useEffect(() => {
    if (type && def) setText(currentText ?? def.defaultText);
  }, [type, currentText, def]);

  if (!type || !def) return null;

  const insert = (key: string) => {
    const el = ref.current;
    const token = `{${key}}`;
    if (!el) return setText((t) => t + token);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const unknown = unknownVariables(text, def.variables);
  const preview = fillTemplate(text, Object.fromEntries(def.variables.map((v) => [v.key, v.sample])));

  const save = async () => {
    if (text.trim().length < 10) {
      toast({ title: "Mesaj çok kısa", description: "Lütfen anlamlı bir mesaj yazın.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await scheduledMessageService.updateMessageText(type, text.trim());
      toast({ title: "Mesaj kaydedildi", description: `${def.title} metni güncellendi.` });
      onSaved(type, text.trim());
      onClose();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Kaydedilemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">{def.title} — Mesaj Metni</DialogTitle>
          <DialogDescription>Velilere gidecek mesajı düzenleyin. Değişkenler gönderilirken gerçek bilgiyle değişir.</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-gray-600">Değişken eklemek için imleci metinde bir yere koyup düğmeye basın:</p>
            <div className="flex flex-wrap gap-1.5">
              {def.variables.map((v) => (
                <Button key={v.key} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => insert(v.key)}>
                  {v.label} <span className="ml-1 font-mono text-gray-500">{`{${v.key}}`}</span>
                </Button>
              ))}
            </div>
          </div>

          <Textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={900} />
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{text.length}/900</span>
            <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => setText(def.defaultText)}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Varsayılana dön
            </Button>
          </div>

          {unknown.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>Tanınmayan değişken: {unknown.map((k) => `{${k}}`).join(", ")}. Bu mesajda gerçek bilgiyle değişmez; yazımı kontrol edin.</AlertDescription>
            </Alert>
          )}

          <div>
            <Badge variant="secondary" className="mb-1">Önizleme (örnek bilgilerle)</Badge>
            <div className="whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-sm">{preview}</div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              WhatsApp, velinin son 24 saat içinde yazmadığı durumlarda yalnızca Meta tarafından onaylı şablonları gönderir. Burada yaptığınız değişiklik,
              aynı metin Meta Business panelinde de onaylatılana kadar gerçek gönderimde kullanılamaz. Otomatik gönderim zamanlayıcısı henüz kurulu değildir.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Vazgeç</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

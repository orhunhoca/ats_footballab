import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parentService, type ChildGallery } from "@/services/parentService";
import { useToast } from "@/hooks/use-toast";

/** Çocuğun/grubunun antrenman fotoğrafları. Yalnızca veli okul içi paylaşım onayı verdiyse gösterilir. */
export function ChildGalleryCard({ studentId, userId }: { studentId: string; userId: string }) {
  const { toast } = useToast();
  const [gallery, setGallery] = useState<ChildGallery | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const g = await parentService.getChildGallery(studentId);
      setGallery(g);
      setUrls(await parentService.signGalleryUrls(g.items.map((i) => i.path)));
    } catch {
      setError(true);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const giveConsent = async () => {
    setSaving(true);
    try {
      await parentService.setMediaConsent(userId, true);
      await load();
    } catch (e) {
      toast({ title: "Hata", description: e instanceof Error ? e.message : "Onay kaydedilemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-gray-600">Galeri yüklenemedi.</p>;
  if (!gallery) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />;

  if (!gallery.consent) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-gray-700">
          Antrenman fotoğraflarını görebilmek için, öğrencinin fotoğraf ve videolarının okul içinde saklanmasına ve velilere paylaşılmasına açık rıza vermeniz gerekir.
          Rızanızı istediğiniz zaman okula bildirerek geri alabilirsiniz.
        </p>
        <Button onClick={giveConsent} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Onay veriyorum
        </Button>
      </div>
    );
  }

  if (gallery.items.length === 0) return <p className="text-sm text-gray-600">Henüz paylaşılmış fotoğraf yok.</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {gallery.items.map((item) =>
        urls[item.path] ? (
          <a key={item.id} href={urls[item.path]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
            <img src={urls[item.path]} alt={item.caption || "Antrenman fotoğrafı"} loading="lazy" className="aspect-square w-full object-cover" />
            <p className="truncate px-2 py-1 text-xs text-gray-600">
              {new Date(item.created_at).toLocaleDateString("tr-TR")}
              {item.caption ? ` · ${item.caption}` : ""}
            </p>
          </a>
        ) : null,
      )}
    </div>
  );
}

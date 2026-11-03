import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, KeyRound, Loader2, MessageCircle, Trash2, UserX, AlertTriangle } from "lucide-react";
import { parentService, type LinkedParent, type ParentInvite } from "@/services/parentService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; name: string } | null;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");

/** Öğrenci için veli davet kodu üretir/iptal eder; bağlı veli hesaplarını gösterir (admin + yönetici). */
export function ParentInviteDialog({ open, onOpenChange, student }: Props) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<ParentInvite[]>([]);
  const [parents, setParents] = useState<LinkedParent[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [toUnlink, setToUnlink] = useState<LinkedParent | null>(null);

  const load = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [inv, par, isOpen] = await Promise.all([
        parentService.listInvites(student.id),
        parentService.listStudentParents(student.id),
        parentService.isRegistrationOpen(),
      ]);
      setInvites(inv);
      setParents(par);
      setRegistrationOpen(isOpen);
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Bilgiler yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [student, toast]);

  useEffect(() => {
    if (open) {
      setNewCode(null);
      load();
    }
  }, [open, load]);

  const registrationUrl = typeof window !== "undefined" ? `${window.location.origin}/veli-kayit` : "/veli-kayit";

  const createInvite = async () => {
    if (!student) return;
    setCreating(true);
    try {
      setNewCode(await parentService.createInvite(student.id));
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Kod üretilemedi.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Kopyalandı", description: `${what} panoya kopyalandı.` });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Metni elle seçip kopyalayın.", variant: "destructive" });
    }
  };

  const message = newCode
    ? `Merhaba, ${student?.name} için veli hesabı davet kodunuz: ${newCode}\n\nKayıt adresi: ${registrationUrl}\n\nKodu girerek e-posta ve şifrenizle kayıt olabilirsiniz. Kod 14 gün geçerlidir.`
    : "";

  const revoke = async (invite: ParentInvite) => {
    try {
      await parentService.revokeInvite(invite.id);
      toast({ title: "Davet iptal edildi" });
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "İptal edilemedi.", variant: "destructive" });
    }
  };

  const unlink = async () => {
    if (!toUnlink || !student) return;
    try {
      await parentService.unlinkParent(toUnlink.parent_user_id, student.id);
      toast({ title: "Bağlantı kaldırıldı", description: "Veli bu öğrencinin bilgilerini artık göremez." });
      setToUnlink(null);
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Bağlantı kaldırılamadı.", variant: "destructive" });
      setToUnlink(null);
    }
  };

  const activeInvites = invites.filter((i) => i.is_active && new Date(i.expires_at).getTime() > Date.now() && i.used_count < i.max_uses);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-6">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              Veli Davet Kodu
            </DialogTitle>
            <DialogDescription>
              {student?.name} için veli hesabı davet kodu üretin. Veli, kodu ve KVKK onayıyla kendi hesabını oluşturur ve otomatik bu öğrenciye bağlanır.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-4 min-w-0">
              {registrationOpen === false && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Veli kaydı şu an <strong>kapalı</strong>. Kodları önceden üretebilirsiniz; veliler, admin Ayarlar → Şirket ve Banka → Veli Erişimi bölümünden kaydı açtığında kayıt olabilir.
                  </AlertDescription>
                </Alert>
              )}

              {newCode && (
                <div className="space-y-2 rounded-md border-2 border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-900">Kod yalnızca şimdi gösterilir; kapatırsanız tekrar görülemez (yeni kod üretilebilir).</p>
                  <p className="select-all text-center font-mono text-3xl font-bold tracking-widest text-emerald-800">{newCode}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(newCode, "Kod")}>
                      <Copy className="mr-2 h-4 w-4" />
                      Kodu kopyala
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copy(message, "Mesaj")}>
                      <Copy className="mr-2 h-4 w-4" />
                      Mesajı kopyala
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp'ta paylaş
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Davet kodları</h4>
                  <Button size="sm" onClick={createInvite} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700">
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    {activeInvites.length > 0 ? "Yeni Kod Üret (eskisi iptal olur)" : "Kod Üret"}
                  </Button>
                </div>
                {invites.length === 0 ? (
                  <p className="text-sm text-gray-600">Bu öğrenci için henüz davet kodu üretilmedi.</p>
                ) : (
                  invites.map((inv) => {
                    const expired = new Date(inv.expires_at).getTime() <= Date.now();
                    const used = inv.used_count >= inv.max_uses;
                    const state = !inv.is_active ? "İptal" : expired ? "Süresi doldu" : used ? "Kullanıldı" : "Aktif";
                    return (
                      <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                        <div className="min-w-0">
                          <Badge variant={state === "Aktif" ? "default" : "secondary"}>{state}</Badge>
                          <span className="ml-2 text-xs text-gray-600">
                            {formatDate(inv.created_at)} · son kullanım {formatDate(inv.expires_at)} · {inv.used_count}/{inv.max_uses} kullanıldı
                          </span>
                        </div>
                        {state === "Aktif" && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => revoke(inv)}>
                            İptal Et
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Bağlı veli hesapları</h4>
                {parents.length === 0 ? (
                  <p className="text-sm text-gray-600">Henüz bağlı veli hesabı yok.</p>
                ) : (
                  parents.map((p) => (
                    <div key={p.parent_user_id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {p.full_name || p.email} {p.relation && <span className="font-normal text-gray-600">({p.relation})</span>}
                          {!p.is_active && <Badge variant="secondary" className="ml-2">Pasif</Badge>}
                        </p>
                        <p className="break-all text-xs text-gray-600">{p.email} · {formatDate(p.linked_at)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0 text-red-600" onClick={() => setToUnlink(p)}>
                        <UserX className="mr-1 h-4 w-4" />
                        Kaldır
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toUnlink} onOpenChange={(o) => !o && setToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Veli bağlantısını kaldır</AlertDialogTitle>
            <AlertDialogDescription>
              {toUnlink?.full_name || toUnlink?.email} hesabının {student?.name} ile bağlantısı kaldırılacak; veli bu öğrencinin bilgilerini artık göremez. Hesap silinmez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={unlink} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Kaldır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

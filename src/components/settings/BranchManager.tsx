import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Loader2, Users, UserCircle2, Power } from "lucide-react";
import { branchService, type Branch, type BranchUsage } from "@/services/branchService";
import { useBranch } from "@/contexts/BranchContext";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { name: "", address: "", phone: "" };

/**
 * Şube yönetimi (Ayarlar → Okul Ayarları). Yalnızca admin'in eriştiği Ayarlar sayfasında kullanılır.
 * Eklenen/güncellenen şubeler BranchContext üzerinden tüm sayfalara ve formlara anında yansır.
 */
export function BranchManager() {
  const { toast } = useToast();
  const { branches, activeBranches, reload, loading: branchesLoading } = useBranch();

  const [usage, setUsage] = useState<Record<string, BranchUsage>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Branch | null>(null);

  const loadUsage = async () => {
    try {
      setUsage(await branchService.getUsage());
    } catch (error) {
      console.error("Şube kullanım sayıları yüklenemedi:", error);
    }
  };

  useEffect(() => {
    loadUsage();
  }, [branches.length]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({ name: b.name, address: b.address || "", phone: b.phone || "" });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Eksik Bilgi", description: "Şube adı zorunludur.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await branchService.update(editing.id, form);
        toast({ title: "Şube güncellendi", description: `${form.name.trim()} kaydedildi.` });
      } else {
        await branchService.create(form);
        toast({ title: "Şube eklendi", description: `${form.name.trim()} oluşturuldu.` });
      }
      setIsFormOpen(false);
      await reload();
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Şube kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b: Branch) => {
    try {
      await branchService.update(b.id, { is_active: !b.is_active });
      toast({
        title: b.is_active ? "Şube pasife alındı" : "Şube aktifleştirildi",
        description: b.is_active
          ? "Yeni kayıtlarda seçilemez; mevcut kayıtlar korunur."
          : "Artık yeni kayıtlarda seçilebilir.",
      });
      await reload();
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "İşlem yapılamadı.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await branchService.remove(toDelete.id);
      toast({ title: "Şube silindi", description: `${toDelete.name} silindi.` });
      setToDelete(null);
      await reload();
    } catch (error) {
      toast({
        title: "Silinemedi",
        description: error instanceof Error ? error.message : "Şube silinemedi.",
        variant: "destructive",
      });
      setToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Şubeler</CardTitle>
            <CardDescription>
              Eklediğiniz şubeler öğrenci, antrenör, grup, yoklama, performans, ödeme ve rapor ekranlarında otomatik görünür.
            </CardDescription>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Şube
          </Button>
        </CardHeader>
        <CardContent>
        {branchesLoading && branches.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : branches.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-gray-600">Henüz şube yok. "Yeni Şube" ile ekleyin.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => {
              const u = usage[b.id] || { students: 0, coaches: 0, groups: 0 };
              const isLastActive = b.is_active && activeBranches.length === 1;
              return (
                <Card key={b.id} className={b.is_active ? "" : "opacity-70"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="truncate">{b.name}</span>
                      </span>
                      <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Aktif" : "Pasif"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-sm text-gray-600">
                      {b.address && (
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="break-words">{b.address}</span>
                        </p>
                      )}
                      {b.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 shrink-0" />
                          {b.phone}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-gray-50 p-2">
                        <Users className="w-4 h-4 mx-auto text-blue-600" />
                        <p className="text-lg font-bold">{u.students}</p>
                        <p className="text-xs text-gray-500">Öğrenci</p>
                      </div>
                      <div className="rounded-md bg-gray-50 p-2">
                        <UserCircle2 className="w-4 h-4 mx-auto text-purple-600" />
                        <p className="text-lg font-bold">{u.coaches}</p>
                        <p className="text-xs text-gray-500">Antrenör</p>
                      </div>
                      <div className="rounded-md bg-gray-50 p-2">
                        <Users className="w-4 h-4 mx-auto text-emerald-600" />
                        <p className="text-lg font-bold">{u.groups}</p>
                        <p className="text-xs text-gray-500">Grup</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(b)}
                        disabled={isLastActive}
                        title={isLastActive ? "En az bir aktif şube olmalı" : undefined}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {b.is_active ? "Pasife Al" : "Aktifleştir"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setToDelete(b)}
                        disabled={isLastActive}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        </CardContent>
      </Card>

    <Dialog open={isFormOpen} onOpenChange={(o) => !saving && setIsFormOpen(o)}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Şubeyi Düzenle" : "Yeni Şube"}</DialogTitle>
            <DialogDescription>Şube adı öğrenci, antrenör ve grup kayıtlarında görünür.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="branch-name">Şube Adı *</Label>
            <Input
              id="branch-name"
              value={form.name}
              placeholder="Örn: Kadıköy Şubesi"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-address">Adres</Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch-phone">Telefon</Label>
            <Input
              id="branch-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Şubeyi Sil</AlertDialogTitle>
          <AlertDialogDescription>
            {toDelete?.name} şubesini silmek istediğinizden emin misiniz? Şubeye bağlı öğrenci, antrenör, grup veya
            ödeme kaydı varsa silinemez; bu durumda şubeyi pasife alın.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

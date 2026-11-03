import { SEO } from "@/components/SEO";
import { RoleGate } from "@/components/RoleGate";
import { Navigation } from "@/components/Navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Loader2, ShieldCheck, UserPlus, RefreshCw, Copy, Eye, EyeOff, Info } from "lucide-react";
import { userService } from "@/services/userService";
import { authService } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type DbRole = "admin" | "manager" | "user" | "parent" | "pending";

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: DbRole | string | null;
  created_at: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Yönetici",
  user: "Antrenör",
  parent: "Veli",
  pending: "Beklemede",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  user: "bg-emerald-100 text-emerald-800",
  parent: "bg-purple-100 text-purple-800",
  pending: "bg-amber-100 text-amber-800",
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
};

function UsersPageInner() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  const [pendingChange, setPendingChange] = useState<{ user: ProfileRow; role: DbRole } | null>(null);
  const [changing, setChanging] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: auth }, rows] = await Promise.all([supabase.auth.getUser(), userService.getUsers()]);
      setMyId(auth.user?.id ?? null);
      setUsers(rows as ProfileRow[]);
    } catch (error) {
      console.error("Kullanıcılar yüklenemedi:", error);
      toast({ title: "Hata", description: "Kullanıcılar yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    setChanging(true);
    try {
      await userService.updateUser(pendingChange.user.id, { role: pendingChange.role });
      toast({
        title: "Yetki güncellendi",
        description: `${pendingChange.user.full_name || pendingChange.user.email} artık: ${ROLE_LABEL[pendingChange.role]}.`,
      });
      setPendingChange(null);
      await load();
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Yetki güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setChanging(false);
    }
  };

  const openAdd = () => {
    setForm({ fullName: "", email: "", password: generatePassword() });
    setShowPassword(true);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      toast({ title: "Eksik Bilgi", description: "Ad soyad ve e-posta zorunludur.", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Zayıf Şifre", description: "Şifre en az 8 karakter olmalıdır.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      await authService.createUserWithoutLogin(form.email.trim(), form.password, form.fullName.trim(), "manager");
      toast({
        title: "Yönetici eklendi",
        description: `${form.fullName.trim()} belirlenen şifre ile giriş yapabilir. Şifreyi kendisine güvenli bir yolla iletin.`,
      });
      setIsAddOpen(false);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Yönetici eklenemedi.";
      toast({
        title: message.includes("already registered") ? "E-posta Zaten Kayıtlı" : "Hata",
        description: message.includes("already registered")
          ? "Bu e-posta ile kayıtlı bir kullanıcı var. Listeden yetkisini 'Yönetici' yapabilirsiniz."
          : message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <SEO title="Kullanıcılar - FootbalLab" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kullanıcılar ve Yetkiler</h1>
              <p className="text-gray-600 mt-1">Yönetici atayın, antrenör ve bekleyen hesapların yetkisini belirleyin.</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAdd}>
              <UserPlus className="w-4 h-4 mr-2" />
              Yönetici Ekle
            </Button>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>Roller</AlertTitle>
            <AlertDescription className="text-blue-800 space-y-1 mt-1">
              <p><strong>Admin:</strong> Şube, antrenör, şablon ve ayarları girer; yönetici atar.</p>
              <p><strong>Yönetici:</strong> Tüm şubelerin öğrenci, yoklama, ödeme ve raporlarına ulaşır; kayıt girer.</p>
              <p><strong>Antrenör:</strong> Yoklama, öğrenci bilgileri, performans testleri ve raporları görür; öğrenci ve deneme öğrencisi kaydı ekler. Antrenör eklerken/düzenlerken "Şube Yetkisi" ile yalnızca kendi şubesi veya tüm şubeler seçilir.</p>
              <p><strong>Veli:</strong> Davet koduyla kendisi kayıt olur; yalnızca kendi çocuğuna ait portalı görür. Öğrenci kartındaki "Veli Davet Kodu" ile yönetilir.</p>
              <p><strong>Beklemede:</strong> Hiçbir veriye erişemez. Antrenör hesaplarını "Antrenörler" sayfasından açın.</p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Hesaplar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-gray-600">Kullanıcı bulunamadı.</p>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === myId;
                  const isAdminRow = u.role === "admin";
                  return (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-white p-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {u.full_name || u.email}
                          {isSelf && <span className="ml-2 text-xs text-gray-500">(siz)</span>}
                        </p>
                        <p className="text-sm text-gray-600 break-all">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={ROLE_BADGE[u.role || "pending"] || ""}>{ROLE_LABEL[u.role || "pending"] || u.role}</Badge>
                        {isAdminRow || isSelf ? (
                          <span className="text-xs text-gray-500 w-[150px] text-right">
                            {isAdminRow ? "Admin yetkisi değiştirilemez" : ""}
                          </span>
                        ) : u.role === "parent" ? (
                          // Veli hesabı yanlışlıkla personele yükseltilemez; yalnızca pasife alınabilir
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-[150px] text-red-600"
                            onClick={() => setPendingChange({ user: u, role: "pending" })}
                          >
                            Hesabı Pasife Al
                          </Button>
                        ) : (
                          <Select
                            value={(u.role as string) || "pending"}
                            onValueChange={(v) => setPendingChange({ user: u, role: v as DbRole })}
                          >
                            <SelectTrigger className="w-[150px]" aria-label="Yetki seç">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Yönetici</SelectItem>
                              <SelectItem value="user">Antrenör</SelectItem>
                              <SelectItem value="pending">Beklemede</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isAddOpen} onOpenChange={(o) => !adding && setIsAddOpen(o)}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAdd} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Yönetici Ekle</DialogTitle>
                <DialogDescription>
                  Hesap geçici şifreyle açılır. Yönetici tüm şubelerin verilerine ulaşır.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="mgr-name">Ad Soyad *</Label>
                <Input id="mgr-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgr-email">E-posta * (giriş için)</Label>
                <Input id="mgr-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgr-pass">Geçici Şifre *</Label>
                <div className="flex gap-2">
                  <Input
                    id="mgr-pass"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)} aria-label="Şifreyi göster/gizle">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => { setForm({ ...form, password: generatePassword() }); setShowPassword(true); }} aria-label="Yeni şifre üret">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Şifreyi kopyala"
                    onClick={async () => {
                      await navigator.clipboard.writeText(form.password);
                      toast({ title: "Kopyalandı", description: "Geçici şifre panoya kopyalandı." });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={adding}>İptal</Button>
                <Button type="submit" disabled={adding} className="bg-emerald-600 hover:bg-emerald-700">
                  {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Yönetici Ekle
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!pendingChange} onOpenChange={(o) => !o && !changing && setPendingChange(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Yetkiyi Değiştir</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingChange?.user.full_name || pendingChange?.user.email} kullanıcısının yetkisi{" "}
                <strong>{pendingChange ? ROLE_LABEL[pendingChange.role] : ""}</strong> olarak değiştirilecek.
                {pendingChange?.role === "manager" && " Yönetici tüm şubelerin öğrenci, ödeme ve rapor verilerini görür."}
                {pendingChange?.role === "pending" && " Kullanıcı hiçbir veriye erişemez."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={changing}>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRoleChange} disabled={changing}>
                {changing ? "Kaydediliyor..." : "Onayla"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default function UsersPage() {
  return (
    <RoleGate level="admin">
      <UsersPageInner />
    </RoleGate>
  );
}

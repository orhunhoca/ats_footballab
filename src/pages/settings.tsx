import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useState, useEffect } from "react";
import { Settings, Shield, Bell, Building2, User, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_attendance: true,
    email_performance: true,
    sms_reminders: false,
  });

  // School settings
  const [schoolSettings, setSchoolSettings] = useState({
    school_name: "Sportex Futbol Okulu",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setProfileForm({
          full_name: user.full_name || "",
          email: user.email || "",
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı bilgileri yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      await authService.updateProfile(currentUser.id, {
        full_name: profileForm.full_name,
      });
      
      toast({
        title: "Başarılı",
        description: "Profil bilgileriniz güncellendi",
      });
      
      loadUserData();
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.new || !passwordForm.confirm) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await authService.updatePassword(passwordForm.new);
      
      toast({
        title: "Başarılı",
        description: "Şifreniz güncellendi",
      });
      
      setPasswordForm({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error("Password update error:", error);
      toast({
        title: "Hata",
        description: "Şifre güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <SEO title="Ayarlar" />
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Yükleniyor...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Ayarlar - Sportex Futbol Okulu" />
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
              <p className="text-slate-600 dark:text-slate-400">Profil ve sistem ayarlarınızı yönetin</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="w-4 h-4 mr-2" />
                Güvenlik
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Bildirimler
              </TabsTrigger>
              <TabsTrigger value="school">
                <Building2 className="w-4 h-4 mr-2" />
                Okul Ayarları
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profil Bilgileri</CardTitle>
                  <CardDescription>
                    Kişisel bilgilerinizi güncelleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Ad Soyad</Label>
                    <Input
                      id="full-name"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="bg-slate-50 dark:bg-slate-900"
                    />
                    <p className="text-xs text-slate-500">E-posta adresi değiştirilemez</p>
                  </div>
                  <div className="pt-4">
                    <Button onClick={handleUpdateProfile} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        "Değişiklikleri Kaydet"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Şifre Değiştir</CardTitle>
                  <CardDescription>
                    Hesap güvenliğiniz için güçlü bir şifre kullanın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Yeni Şifre</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="En az 6 karakter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      placeholder="Şifrenizi tekrar girin"
                    />
                  </div>
                  <div className="pt-4">
                    <Button onClick={handleUpdatePassword} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Güncelleniyor...
                        </>
                      ) : (
                        "Şifreyi Güncelle"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Bildirim Tercihleri</CardTitle>
                  <CardDescription>
                    Hangi bildirimleri almak istediğinizi seçin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Yoklama Bildirimleri</Label>
                      <p className="text-sm text-slate-500">Yoklama alındığında e-posta gönder</p>
                    </div>
                    <Switch
                      checked={notifications.email_attendance}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_attendance: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Performans Raporları</Label>
                      <p className="text-sm text-slate-500">Yeni test sonuçları için e-posta</p>
                    </div>
                    <Switch
                      checked={notifications.email_performance}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_performance: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>SMS Hatırlatmaları</Label>
                      <p className="text-sm text-slate-500">Antrenman hatırlatmaları için SMS</p>
                    </div>
                    <Switch
                      checked={notifications.sms_reminders}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, sms_reminders: checked })
                      }
                    />
                  </div>
                  <div className="pt-4">
                    <Button>Tercihleri Kaydet</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* School Settings Tab */}
            <TabsContent value="school">
              <Card>
                <CardHeader>
                  <CardTitle>Okul Bilgileri</CardTitle>
                  <CardDescription>
                    Futbol okulunuzun genel bilgilerini düzenleyin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">Okul Adı</Label>
                    <Input
                      id="school-name"
                      value={schoolSettings.school_name}
                      onChange={(e) =>
                        setSchoolSettings({ ...schoolSettings, school_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-address">Adres</Label>
                    <Input
                      id="school-address"
                      value={schoolSettings.address}
                      onChange={(e) =>
                        setSchoolSettings({ ...schoolSettings, address: e.target.value })
                      }
                      placeholder="Okul adresi"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-phone">Telefon</Label>
                      <Input
                        id="school-phone"
                        value={schoolSettings.phone}
                        onChange={(e) =>
                          setSchoolSettings({ ...schoolSettings, phone: e.target.value })
                        }
                        placeholder="0XXX XXX XX XX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-email">E-posta</Label>
                      <Input
                        id="school-email"
                        type="email"
                        value={schoolSettings.email}
                        onChange={(e) =>
                          setSchoolSettings({ ...schoolSettings, email: e.target.value })
                        }
                        placeholder="info@okul.com"
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button>Kaydet</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { authService } from "@/services/authService";
import { whatsappService } from "@/services/whatsappService";
import { scheduledMessageService } from "@/services/scheduledMessageService";
import { iyzicoService } from "@/services/iyzicoService";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Settings, Shield, Bell, Building2, User, Loader2, MessageSquare, CheckCircle2, AlertCircle, CalendarClock, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { role, loading: roleLoading, isAdmin } = useUserRole();
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
    school_name: "FootbalLab Futbol Okulu",
    address: "",
    phone: "",
    email: "",
  });

  // WhatsApp settings
  const [whatsappSettings, setWhatsappSettings] = useState({
    phone_number_id: "",
    access_token: "",
    business_account_id: "",
    is_active: false
  });
  const [whatsappTestPhone, setWhatsappTestPhone] = useState("");
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  // Scheduler settings
  const [schedulerSettings, setSchedulerSettings] = useState({
    training_reminder_enabled: false,
    training_reminder_hours_before: 1,
    payment_reminder_enabled: false,
    birthday_enabled: false,
    anniversary_enabled: false,
  });

  // iyzico settings state
  const [iyzicoSettings, setIyzicoSettings] = useState({
    api_key: "",
    secret_key: "",
    base_url: "https://sandbox-api.iyzipay.com",
    is_active: false
  });

  useEffect(() => {
    loadUserData();
    loadWhatsappSettings();
    loadSchedulerSettings();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Erişim Reddedildi",
        description: "Bu sayfaya erişim yetkiniz yok. Sadece yöneticiler ayarlara erişebilir.",
        variant: "destructive",
      });
      router.push("/");
    }
  }, [roleLoading, isAdmin, router, toast]);

  const loadSchedulerSettings = async () => {
    try {
      const schedSettings = await scheduledMessageService.getSchedulerSettings();
      if (schedSettings.length > 0) {
        const training = schedSettings.find(s => s.setting_type === "training_reminder");
        const payment = schedSettings.find(s => s.setting_type === "payment_reminder");
        const birthday = schedSettings.find(s => s.setting_type === "birthday_greeting");
        const anniversary = schedSettings.find(s => s.setting_type === "anniversary_greeting");

        setSchedulerSettings({
          training_reminder_enabled: training?.enabled || false,
          training_reminder_hours_before: training?.hours_before || 1,
          payment_reminder_enabled: payment?.enabled || false,
          birthday_enabled: birthday?.enabled || false,
          anniversary_enabled: anniversary?.enabled || false,
        });
      }

      // Load iyzico settings
      const iyzico = await iyzicoService.getSettings();
      if (iyzico) {
        setIyzicoSettings({
          // Sırlar sunucudan okunamaz; boş bırakılırsa kayıtlı değer korunur
          api_key: "",
          secret_key: "",
          base_url: iyzico.base_url || "https://sandbox-api.iyzipay.com",
          is_active: iyzico.is_active || false
        });
      }

    } catch (error) {
      console.error("Error loading user data:", error);
      toast({
        title: "Hata",
        description: "Kullanıcı bilgileri yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedulerSettings = async () => {
    try {
      setSaving(true);
      // Save Scheduler settings
      await scheduledMessageService.updateSchedulerSettings(schedulerSettings);

      // Save iyzico settings
      await iyzicoService.saveSettings(iyzicoSettings);
      
      toast({
        title: "Başarılı",
        description: "Tüm ayarlar başarıyla kaydedildi.",
      });
    } catch (error) {
      console.error("Scheduler settings error:", error);
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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

  const loadWhatsappSettings = async () => {
    const settings = await whatsappService.getSettings();
    if (settings) {
      setWhatsappSettings({
        phone_number_id: settings.phone_number_id || "",
        // Sır sunucudan okunamaz; boş bırakılırsa kayıtlı değer korunur
        access_token: "",
        business_account_id: settings.business_account_id || "",
        is_active: settings.is_active || false
      });
    }
  };

  const handleSaveWhatsappSettings = async () => {
    try {
      setSaving(true);
      const result = await whatsappService.saveSettings(whatsappSettings);
      
      if (result.success) {
        toast({
          title: "Başarılı",
          description: "WhatsApp ayarları kaydedildi",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("WhatsApp settings error:", error);
      toast({
        title: "Hata",
        description: "WhatsApp ayarları kaydedilirken hata oluştu",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsappConnection = async () => {
    if (!whatsappTestPhone) {
      toast({
        title: "Hata",
        description: "Lütfen test için bir telefon numarası girin",
        variant: "destructive",
      });
      return;
    }

    try {
      setTestingWhatsapp(true);
      // Save settings first if changed
      await whatsappService.saveSettings(whatsappSettings);
      
      const result = await whatsappService.testConnection(whatsappTestPhone);
      
      if (result.success) {
        toast({
          title: "Başarılı",
          description: "Test mesajı başarıyla gönderildi!",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("WhatsApp test error:", error);
      toast({
        title: "Hata",
        description: `Test başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        variant: "destructive",
      });
    } finally {
      setTestingWhatsapp(false);
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

  if (loading || roleLoading) {
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

  // If not admin, don't render the page (redirect will happen via useEffect)
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <SEO title="Ayarlar - FootbalLab Futbol Okulu" />
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
              <p className="text-slate-600 dark:text-slate-400">Profil ve sistem ayarlarınızı yönetin</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="flex w-full justify-start">
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
              <TabsTrigger value="whatsapp">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="scheduler">
                <CalendarClock className="w-4 h-4 mr-2" />
                Otomatik Mesajlar
              </TabsTrigger>
              <TabsTrigger value="payment">
                <CreditCard className="w-4 h-4 mr-2" />
                Online Ödeme
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* WhatsApp Settings Tab */}
            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Entegrasyonu</CardTitle>
                  <CardDescription>
                    WhatsApp Business API yapılandırması
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">WhatsApp Entegrasyonu</Label>
                      <p className="text-sm text-muted-foreground">
                        Otomatik bildirimler için WhatsApp'ı etkinleştirin
                      </p>
                    </div>
                    <Switch
                      checked={whatsappSettings.is_active}
                      onCheckedChange={(checked) =>
                        setWhatsappSettings({ ...whatsappSettings, is_active: checked })
                      }
                    />
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-number-id">Telefon Numarası ID (Phone Number ID)</Label>
                      <Input
                        id="phone-number-id"
                        value={whatsappSettings.phone_number_id}
                        onChange={(e) =>
                          setWhatsappSettings({ ...whatsappSettings, phone_number_id: e.target.value })
                        }
                        placeholder="Örn: 104xxxxxxxxxxxxx"
                      />
                      <p className="text-xs text-muted-foreground">
                        Meta Business Manager &gt; WhatsApp &gt; API Kurulumu sayfasından alabilirsiniz.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-token">Erişim Anahtarı (Access Token)</Label>
                      <Input
                        id="access-token"
                        type="password"
                        value={whatsappSettings.access_token}
                        onChange={(e) =>
                          setWhatsappSettings({ ...whatsappSettings, access_token: e.target.value })
                        }
                        placeholder="Kayıtlı değer korunur — değiştirmek için yeni anahtar girin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="business-account-id">İşletme Hesabı ID (Business Account ID)</Label>
                      <Input
                        id="business-account-id"
                        value={whatsappSettings.business_account_id}
                        onChange={(e) =>
                          setWhatsappSettings({ ...whatsappSettings, business_account_id: e.target.value })
                        }
                        placeholder="Örn: 101xxxxxxxxxxxxx"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t mt-4">
                    <Button onClick={handleSaveWhatsappSettings} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Ayarları Kaydet
                    </Button>
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-medium mb-4">Bağlantı Testi</h3>
                    <div className="flex gap-4 items-end">
                      <div className="grid gap-2 flex-1">
                        <Label htmlFor="test-phone">Test Telefon Numarası</Label>
                        <Input
                          id="test-phone"
                          value={whatsappTestPhone}
                          onChange={(e) => setWhatsappTestPhone(e.target.value)}
                          placeholder="905xxxxxxxxx"
                        />
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={handleTestWhatsappConnection}
                        disabled={testingWhatsapp || !whatsappSettings.is_active}
                      >
                        {testingWhatsapp ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Test Ediliyor...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Test Mesajı Gönder
                          </>
                        )}
                      </Button>
                    </div>
                    {!whatsappSettings.is_active && (
                      <div className="flex items-center gap-2 mt-2 text-amber-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Test etmek için önce entegrasyonu etkinleştirin ve kaydedin.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scheduler Settings Tab */}
            <TabsContent value="scheduler">
              <Card>
                <CardHeader>
                  <CardTitle>Otomatik Mesaj Ayarları</CardTitle>
                  <CardDescription>
                    Sistemin otomatik göndereceği WhatsApp mesajlarını yapılandırın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Antrenman Hatırlatıcı */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Antrenman Hatırlatıcısı</Label>
                      <p className="text-sm text-muted-foreground">
                        Antrenmandan önce velilere otomatik hatırlatma gönder
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {schedulerSettings.training_reminder_enabled && (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="1" 
                            max="24"
                            className="w-20 text-center"
                            value={schedulerSettings.training_reminder_hours_before}
                            onChange={(e) => setSchedulerSettings({
                              ...schedulerSettings, 
                              training_reminder_hours_before: parseInt(e.target.value) || 1
                            })}
                          />
                          <span className="text-sm text-muted-foreground">saat önce</span>
                        </div>
                      )}
                      <Switch
                        checked={schedulerSettings.training_reminder_enabled}
                        onCheckedChange={(checked) =>
                          setSchedulerSettings({ ...schedulerSettings, training_reminder_enabled: checked })
                        }
                      />
                    </div>
                  </div>

                  {/* Ödeme Hatırlatıcı */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Ödeme Hatırlatıcısı</Label>
                      <p className="text-sm text-muted-foreground">
                        Ödeme günü yaklaşan velilere otomatik hatırlatma (15 gün, 7 gün ve son gün)
                      </p>
                    </div>
                    <Switch
                      checked={schedulerSettings.payment_reminder_enabled}
                      onCheckedChange={(checked) =>
                        setSchedulerSettings({ ...schedulerSettings, payment_reminder_enabled: checked })
                      }
                    />
                  </div>

                  {/* Doğum Günü Kutlaması */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Doğum Günü Kutlaması</Label>
                      <p className="text-sm text-muted-foreground">
                        Öğrencilerin doğum günlerinde otomatik kutlama mesajı gönder (09:00)
                      </p>
                    </div>
                    <Switch
                      checked={schedulerSettings.birthday_enabled}
                      onCheckedChange={(checked) =>
                        setSchedulerSettings({ ...schedulerSettings, birthday_enabled: checked })
                      }
                    />
                  </div>

                  {/* Yıl Dönümü Kutlaması */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Kayıt Yıl Dönümü</Label>
                      <p className="text-sm text-muted-foreground">
                        Kayıt yıl dönümlerinde tebrik mesajı gönder (10:00)
                      </p>
                    </div>
                    <Switch
                      checked={schedulerSettings.anniversary_enabled}
                      onCheckedChange={(checked) =>
                        setSchedulerSettings({ ...schedulerSettings, anniversary_enabled: checked })
                      }
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleSaveSchedulerSettings} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Ayarları Güncelle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* iyzico / Online Payment Settings Tab */}
            <TabsContent value="payment">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold">Online Ödeme Ayarları (iyzico)</h2>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">iyzico Entegrasyonu</Label>
                      <p className="text-sm text-muted-foreground">
                        Online ödeme almak için iyzico entegrasyonunu etkinleştirin
                      </p>
                    </div>
                    <Switch
                      checked={iyzicoSettings.is_active}
                      onCheckedChange={(checked) => setIyzicoSettings({ ...iyzicoSettings, is_active: checked })}
                    />
                  </div>

                  {iyzicoSettings.is_active && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>API Key</Label>
                        <Input
                          value={iyzicoSettings.api_key}
                          onChange={(e) => setIyzicoSettings({ ...iyzicoSettings, api_key: e.target.value })}
                          placeholder="Kayıtlı değer korunur — değiştirmek için yeni değer girin"
                          type="password"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Secret Key</Label>
                        <Input
                          value={iyzicoSettings.secret_key}
                          onChange={(e) => setIyzicoSettings({ ...iyzicoSettings, secret_key: e.target.value })}
                          placeholder="Kayıtlı değer korunur — değiştirmek için yeni değer girin"
                          type="password"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Base URL</Label>
                        <Input
                          value={iyzicoSettings.base_url}
                          onChange={(e) => setIyzicoSettings({ ...iyzicoSettings, base_url: e.target.value })}
                          placeholder="https://sandbox-api.iyzipay.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          Test için: https://sandbox-api.iyzipay.com <br />
                          Canlı için: https://api.iyzipay.com
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700">
                    <h4 className="font-semibold mb-1">Bilgilendirme</h4>
                    <p>
                      Bu ayarları kaydettikten sonra, Ödemeler sayfasından öğrenciler için online ödeme linki oluşturabilirsiniz.
                      Ödeme başarılı olduğunda otomatik olarak sisteme işlenecek ve veliye makbuz gönderilecektir.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
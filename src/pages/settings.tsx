import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { settingsService, type PaymentPlan, type Setting } from "@/services/settingsService";
import { userService, type User } from "@/services/userService";
import { useState, useEffect } from "react";
import { Settings, DollarSign, Plus, Edit, Trash2, Save, X, UserPlus, Shield, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { toast } = useToast();
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Form state for payment plan
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "",
    duration_months: "",
    installments: "1",
    installment_price: "",
    is_active: true,
  });

  // Form state for user
  const [userForm, setUserForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "coach" as "admin" | "coach",
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, settingsData, usersData] = await Promise.all([
        settingsService.getAllPaymentPlans(),
        settingsService.getAllSettings(),
        userService.getUsers(),
      ]);
      setPaymentPlans(plansData);
      setSettings(settingsData);
      setUsers(usersData);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Payment Plan handlers
  const openNewPlanDialog = () => {
    setIsNewPlan(true);
    setEditingPlan(null);
    setPlanForm({
      name: "",
      price: "",
      duration_months: "",
      installments: "1",
      installment_price: "",
      is_active: true,
    });
    setIsPlanDialogOpen(true);
  };

  const openEditPlanDialog = (plan: PaymentPlan) => {
    setIsNewPlan(false);
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price.toString(),
      duration_months: plan.duration_months.toString(),
      installments: plan.installments.toString(),
      installment_price: plan.installment_price?.toString() || "",
      is_active: plan.is_active,
    });
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      const planData = {
        name: planForm.name,
        price: parseFloat(planForm.price),
        duration_months: parseInt(planForm.duration_months),
        installments: parseInt(planForm.installments),
        installment_price: planForm.installment_price ? parseFloat(planForm.installment_price) : null,
        is_active: planForm.is_active,
      };

      if (isNewPlan) {
        await settingsService.createPaymentPlan(planData);
        toast({
          title: "Başarılı",
          description: "Ödeme planı eklendi",
        });
      } else if (editingPlan) {
        await settingsService.updatePaymentPlan(editingPlan.id, planData);
        toast({
          title: "Başarılı",
          description: "Ödeme planı güncellendi",
        });
      }

      setIsPlanDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ödeme planı kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Bu ödeme planını silmek istediğinizden emin misiniz?")) return;

    try {
      await settingsService.deletePaymentPlan(id);
      toast({
        title: "Başarılı",
        description: "Ödeme planı silindi",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ödeme planı silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  // User handlers
  const openNewUserDialog = () => {
    setIsNewUser(true);
    setEditingUser(null);
    setUserForm({
      full_name: "",
      username: "",
      password: "",
      role: "coach",
      is_active: true,
    });
    setIsUserDialogOpen(true);
  };

  const openEditUserDialog = (user: User) => {
    setIsNewUser(false);
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name,
      username: user.username,
      password: "",
      role: user.role as "admin" | "coach",
      is_active: user.is_active,
    });
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (isNewUser) {
        if (!userForm.password) {
          toast({
            title: "Hata",
            description: "Şifre gereklidir",
            variant: "destructive",
          });
          return;
        }
        await userService.createUser(userForm);
        toast({
          title: "Başarılı",
          description: "Kullanıcı eklendi",
        });
      } else if (editingUser) {
        const updateData: any = {
          full_name: userForm.full_name,
          username: userForm.username,
          role: userForm.role,
          is_active: userForm.is_active,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await userService.updateUser(editingUser.id, updateData);
        toast({
          title: "Başarılı",
          description: "Kullanıcı güncellendi",
        });
      }

      setIsUserDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kullanıcı kaydedilirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;

    try {
      await userService.deleteUser(id);
      toast({
        title: "Başarılı",
        description: "Kullanıcı silindi",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kullanıcı silinirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await settingsService.updateSetting(key, value);
      toast({
        title: "Başarılı",
        description: "Ayar güncellendi",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayar güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <>
        <SEO title="Ayarlar" />
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
          <div className="max-w-6xl mx-auto">
            <p className="text-center text-slate-600 dark:text-slate-400">Yükleniyor...</p>
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
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
                <p className="text-slate-600 dark:text-slate-400">Kullanıcılar, ödeme planları ve sistem ayarları</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
              <TabsTrigger value="payment-plans">Ödeme Planları</TabsTrigger>
              <TabsTrigger value="general">Genel Ayarlar</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Kullanıcılar</CardTitle>
                      <CardDescription>
                        Sistem kullanıcılarını ve yetkilerini yönetin
                      </CardDescription>
                    </div>
                    <Button onClick={openNewUserDialog} className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Yeni Kullanıcı
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{user.full_name}</h3>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Admin' : 'Antrenör'}
                              </Badge>
                              {!user.is_active && (
                                <Badge variant="outline">Pasif</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUserDialog(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Plans Tab */}
            <TabsContent value="payment-plans" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ödeme Planları</CardTitle>
                      <CardDescription>
                        Öğrenci kayıtlarında kullanılacak ödeme planlarını yönetin
                      </CardDescription>
                    </div>
                    <Button onClick={openNewPlanDialog} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Yeni Plan
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{plan.name}</h3>
                            {!plan.is_active && (
                              <Badge variant="secondary">Pasif</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {plan.price.toLocaleString("tr-TR")} TL
                            </span>
                            <span>•</span>
                            <span>{plan.duration_months} Ay</span>
                            {plan.installments > 1 && (
                              <>
                                <span>•</span>
                                <span>{plan.installments} Taksit</span>
                                {plan.installment_price && (
                                  <>
                                    <span>•</span>
                                    <span>2. Taksit: {plan.installment_price.toLocaleString("tr-TR")} TL</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPlanDialog(plan)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Genel Ayarlar</CardTitle>
                  <CardDescription>
                    Sistem genelinde kullanılan ayarları düzenleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {settings.map((setting) => (
                      <div key={setting.id} className="space-y-2">
                        <Label htmlFor={setting.key}>
                          {setting.description || setting.key}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={setting.key}
                            type="text"
                            defaultValue={setting.value}
                            onBlur={(e) => {
                              if (e.target.value !== setting.value) {
                                handleUpdateSetting(setting.key, e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Payment Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isNewPlan ? "Yeni Ödeme Planı" : "Ödeme Planı Düzenle"}
            </DialogTitle>
            <DialogDescription>
              Ödeme planı bilgilerini girin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Adı</Label>
              <Input
                id="plan-name"
                placeholder="Örn: 6 Aylık, 3 Aylık"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Fiyat (TL)</Label>
              <Input
                id="plan-price"
                type="number"
                placeholder="24000"
                value={planForm.price}
                onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-duration">Süre (Ay)</Label>
              <Input
                id="plan-duration"
                type="number"
                placeholder="6"
                value={planForm.duration_months}
                onChange={(e) => setPlanForm({ ...planForm, duration_months: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-installments">Taksit Sayısı</Label>
              <Input
                id="plan-installments"
                type="number"
                placeholder="1"
                value={planForm.installments}
                onChange={(e) => setPlanForm({ ...planForm, installments: e.target.value })}
              />
            </div>
            {parseInt(planForm.installments) > 1 && (
              <div className="space-y-2">
                <Label htmlFor="plan-installment-price">2. Taksit Tutarı (TL)</Label>
                <Input
                  id="plan-installment-price"
                  type="number"
                  placeholder="23000"
                  value={planForm.installment_price}
                  onChange={(e) => setPlanForm({ ...planForm, installment_price: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="plan-active">Aktif</Label>
              <Switch
                id="plan-active"
                checked={planForm.is_active}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button onClick={handleSavePlan}>
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isNewUser ? "Yeni Kullanıcı" : "Kullanıcı Düzenle"}
            </DialogTitle>
            <DialogDescription>
              Kullanıcı bilgilerini girin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-fullname">Ad Soyad</Label>
              <Input
                id="user-fullname"
                placeholder="Örn: Ahmet Yılmaz"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-username">Kullanıcı Adı</Label>
              <Input
                id="user-username"
                placeholder="Örn: ahmet.yilmaz"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                Şifre {!isNewUser && "(Boş bırakılırsa değişmez)"}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder="••••••••"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rol</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: "admin" | "coach") => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Antrenör</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="user-active">Aktif</Label>
              <Switch
                id="user-active"
                checked={userForm.is_active}
                onCheckedChange={(checked) => setUserForm({ ...userForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUserDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button onClick={handleSaveUser}>
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
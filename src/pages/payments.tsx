import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { paymentService, type PaymentMethod, type PaymentType } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { CreditCard, Wallet, Building2, Loader2, TrendingUp, AlertCircle, CheckCircle2, Link as LinkIcon, Smartphone, MessageCircle } from "lucide-react";
import { SendPaymentReminderDialog } from "@/components/payments/SendPaymentReminderDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOnlineDialogOpen, setIsOnlineDialogOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  
  // Manual Payment Form
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "Nakit" as PaymentMethod,
    payment_type: "registration" as PaymentType,
    installment_number: "",
    notes: ""
  });

  // Online Payment Form
  const [onlineFormData, setOnlineFormData] = useState({
    student_id: "",
    amount: "",
    payment_type: "registration" as PaymentType,
    description: "",
    send_via_whatsapp: true
  });

  useEffect(() => {
    loadData();
    // Check URL params for status messages (e.g. from iyzico callback)
    if (router.query.status === 'success') {
      toast({
        title: "Ödeme Başarılı",
        description: `Ödeme #${router.query.payment} başarıyla alındı.`,
      });
    } else if (router.query.status === 'failed') {
      toast({
        title: "Ödeme Başarısız",
        description: router.query.error as string || "Ödeme işlemi tamamlanamadı.",
        variant: "destructive"
      });
    }
  }, [router.query]);

  async function loadData() {
    try {
      setLoading(true);
      const [paymentsData, studentsData, statsData] = await Promise.all([
        paymentService.getAllPayments(),
        studentService.getAllStudents(),
        paymentService.getPaymentStats()
      ]);
      
      setPayments(paymentsData);
      setStudents(studentsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.student_id || !formData.amount || !formData.payment_method) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen zorunlu alanları doldurun",
        variant: "destructive"
      });
      return;
    }

    try {
      await paymentService.createPayment({
        studentId: formData.student_id,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.payment_method,
        paymentType: formData.payment_type,
        installmentNumber: formData.installment_number ? parseInt(formData.installment_number) : undefined,
        notes: formData.notes || undefined
      });

      toast({
        title: "Başarılı",
        description: "Ödeme kaydedildi"
      });

      setIsDialogOpen(false);
      setFormData({
        student_id: "",
        amount: "",
        payment_method: "Nakit",
        payment_type: "registration",
        installment_number: "",
        notes: ""
      });
      loadData();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Hata",
        description: "Ödeme kaydedilirken bir hata oluştu",
        variant: "destructive"
      });
    }
  }

  async function handleCreateOnlineLink(e: React.FormEvent) {
    e.preventDefault();

    if (!onlineFormData.student_id || !onlineFormData.amount) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen öğrenci ve tutar seçin",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreatingLink(true);
      const result = await paymentService.createOnlinePayment({
        studentId: onlineFormData.student_id,
        amount: parseFloat(onlineFormData.amount),
        paymentType: onlineFormData.payment_type,
        description: onlineFormData.description,
        sendViaWhatsApp: onlineFormData.send_via_whatsapp
      });

      if (result.success) {
        toast({
          title: "Başarılı",
          description: "Ödeme linki oluşturuldu ve gönderildi."
        });
        setIsOnlineDialogOpen(false);
        setOnlineFormData({
          student_id: "",
          amount: "",
          payment_type: "registration",
          description: "",
          send_via_whatsapp: true
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error creating online link:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Ödeme linki oluşturulamadı",
        variant: "destructive"
      });
    } finally {
      setCreatingLink(false);
    }
  }

  function getPaymentMethodIcon(method: PaymentMethod) {
    switch (method) {
      case "Kredi Kartı":
        return <CreditCard className="h-4 w-4" />;
      case "Havale/EFT":
        return <Building2 className="h-4 w-4" />;
      case "Online Ödeme":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <SEO title="Ödemeler - FootbalLab" description="Ödeme takip ve yönetim sistemi" />
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <SEO title="Ödemeler - FootbalLab" description="Ödeme takip ve yönetim sistemi" />
      <Navigation />
      
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Ödemeler</h1>
            <p className="text-gray-600">Ödeme takip ve yönetim sistemi</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setIsReminderOpen(true)}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Ödeme Hatırlatması
            </Button>

            {/* Online Payment Link Dialog */}
            <Dialog open={isOnlineDialogOpen} onOpenChange={setIsOnlineDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Online Ödeme Linki
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleCreateOnlineLink}>
                  <DialogHeader>
                    <DialogTitle>Online Ödeme Linki Oluştur</DialogTitle>
                    <DialogDescription>
                      Öğrenci için güvenli ödeme linki oluşturun ve WhatsApp'tan gönderin.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="online-student">Öğrenci *</Label>
                      <Select
                        value={onlineFormData.student_id}
                        onValueChange={(value) => setOnlineFormData({ ...onlineFormData, student_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Öğrenci seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="online-amount">Tutar (₺) *</Label>
                      <Input
                        id="online-amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={onlineFormData.amount}
                        onChange={(e) => setOnlineFormData({ ...onlineFormData, amount: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="online-payment-type">Ödeme Türü *</Label>
                      <Select
                        value={onlineFormData.payment_type}
                        onValueChange={(value: PaymentType) => setOnlineFormData({ ...onlineFormData, payment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registration">Kayıt Yenileme</SelectItem>
                          <SelectItem value="summer_clothing">Yazlık Kıyafet</SelectItem>
                          <SelectItem value="winter_clothing">Kışlık Kıyafet</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="online-description">Açıklama</Label>
                      <Textarea
                        id="online-description"
                        placeholder="Örn: 2024 Yaz Dönemi Kayıt Ücreti"
                        value={onlineFormData.description}
                        onChange={(e) => setOnlineFormData({ ...onlineFormData, description: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg border border-green-100">
                      <Checkbox 
                        id="send-whatsapp"
                        checked={onlineFormData.send_via_whatsapp}
                        onCheckedChange={(checked) => setOnlineFormData({...onlineFormData, send_via_whatsapp: checked as boolean})}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="send-whatsapp"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                        >
                          <Smartphone className="h-4 w-4 text-green-600" />
                          WhatsApp ile Gönder
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Ödeme linki otomatik olarak velinin telefonuna gönderilir.
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={creatingLink} className="bg-blue-600 hover:bg-blue-700">
                      {creatingLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        "Link Oluştur ve Gönder"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Manual Payment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manuel Ödeme Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Yeni Ödeme</DialogTitle>
                    <DialogDescription>Öğrenci ödemesini manuel kaydedin</DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="student">Öğrenci *</Label>
                      <Select
                        value={formData.student_id}
                        onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Öğrenci seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="amount">Tutar (₺) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="payment_type">Ödeme Türü *</Label>
                      <Select
                        value={formData.payment_type}
                        onValueChange={(value: PaymentType) => setFormData({ ...formData, payment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registration">Kayıt Yenileme</SelectItem>
                          <SelectItem value="summer_clothing">Yazlık Kıyafet</SelectItem>
                          <SelectItem value="winter_clothing">Kışlık Kıyafet</SelectItem>
                          <SelectItem value="other">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="payment_method">Ödeme Yöntemi *</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nakit">Nakit</SelectItem>
                          <SelectItem value="Kredi Kartı">Kredi Kartı</SelectItem>
                          <SelectItem value="Havale/EFT">Havale/EFT</SelectItem>
                          <SelectItem value="Online Ödeme">Online Ödeme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="installment">Taksit Numarası</Label>
                      <Input
                        id="installment"
                        type="number"
                        placeholder="1, 2, 3..."
                        value={formData.installment_number}
                        onChange={(e) => setFormData({ ...formData, installment_number: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notlar</Label>
                      <Textarea
                        id="notes"
                        placeholder="Ek bilgiler..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Ödeme Kaydet
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tahsilat</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₺{stats.totalRevenue.toLocaleString("tr-TR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bekleyen Ödemeler</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₺{stats.pendingPayments.toLocaleString("tr-TR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Ay Tahsilat</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                ₺{stats.monthlyRevenue.toLocaleString("tr-TR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Online Linkler</CardTitle>
              <LinkIcon className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                - {/* Aktif link sayısı eklenebilir */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>Ödeme Geçmişi</CardTitle>
            <CardDescription>Tüm ödeme kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Henüz ödeme kaydı bulunmuyor
                </div>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="p-2 bg-green-100 rounded-lg">
                        {getPaymentMethodIcon(payment.payment_method)}
                      </div>
                      <div>
                        <p className="font-medium">{payment.students?.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString("tr-TR")}
                          {payment.installment_number && ` - Taksit ${payment.installment_number}`}
                        </p>
                        {payment.notes && (
                          <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-bold text-green-600">₺{payment.amount.toLocaleString("tr-TR")}</p>
                      <Badge variant="outline" className="mt-1">
                        {payment.payment_method}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <SendPaymentReminderDialog
        open={isReminderOpen}
        onOpenChange={setIsReminderOpen}
        students={students}
        payments={payments}
      />
    </div>
  );
}
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
import { useToast } from "@/hooks/use-toast";
import { createPayment, getAllPayments, getPaymentStats, type PaymentMethod, type PaymentHistory } from "@/services/paymentService";
import { studentService } from "@/services/studentService";
import { CreditCard, Wallet, Building2, Loader2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PaymentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total_collected: 0,
    pending_payments: 0,
    overdue_payments: 0,
    upcoming_payments: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "cash" as PaymentMethod,
    installment_number: "",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [paymentsData, studentsData, statsData] = await Promise.all([
        getAllPayments(),
        studentService.getAllStudents(),
        getPaymentStats()
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
      await createPayment({
        student_id: formData.student_id,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        installment_number: formData.installment_number ? parseInt(formData.installment_number) : undefined,
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
        payment_method: "cash",
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

  function getPaymentMethodIcon(method: PaymentMethod) {
    switch (method) {
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  }

  function getPaymentMethodLabel(method: PaymentMethod) {
    switch (method) {
      case "credit_card":
        return "Kredi Kartı";
      case "bank_transfer":
        return "Banka Havalesi";
      case "cash":
        return "Nakit";
      default:
        return "Diğer";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <SEO title="Ödemeler - Sportex" description="Ödeme takip ve yönetim sistemi" />
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <SEO title="Ödemeler - Sportex" description="Ödeme takip ve yönetim sistemi" />
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Ödemeler</h1>
            <p className="text-gray-600">Ödeme takip ve yönetim sistemi</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <CreditCard className="mr-2 h-4 w-4" />
                Ödeme Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Yeni Ödeme</DialogTitle>
                  <DialogDescription>Öğrenci ödemesini kaydedin</DialogDescription>
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
                    <Label htmlFor="payment_method">Ödeme Yöntemi *</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Nakit</SelectItem>
                        <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                        <SelectItem value="bank_transfer">Banka Havalesi</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Tahsilat</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₺{stats.total_collected.toLocaleString("tr-TR")}
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
                ₺{stats.pending_payments.toLocaleString("tr-TR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gecikmiş Ödemeler</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₺{stats.overdue_payments.toLocaleString("tr-TR")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yaklaşan Ödemeler</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ₺{stats.upcoming_payments.toLocaleString("tr-TR")}
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        {getPaymentMethodIcon(payment.payment_method)}
                      </div>
                      <div>
                        <p className="font-medium">{payment.students?.first_name} {payment.students?.last_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString("tr-TR")}
                          {payment.installment_number && ` - Taksit ${payment.installment_number}`}
                        </p>
                        {payment.notes && (
                          <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">₺{payment.amount.toLocaleString("tr-TR")}</p>
                      <Badge variant="outline" className="mt-1">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
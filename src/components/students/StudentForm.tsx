import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { studentService } from "@/services/studentService";
import { settingsService, type PaymentPlan } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function StudentForm({ open, onOpenChange, onSuccess }: StudentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    parent_phone: "",
    clothing_size: "",
    work_group_hour: "",
    health_report_submitted: false,
    registration_type: "Yeni Kayıt",
    payment_plan: "",
    payment_amount: "",
    clothing_payment_status: "Ödenmedi",
    payment_status: "Bekliyor"
  });

  useEffect(() => {
    loadPaymentPlans();
  }, []);

  const loadPaymentPlans = async () => {
    try {
      const plans = await settingsService.getPaymentPlans();
      setPaymentPlans(plans);
    } catch (error) {
      console.error("Ödeme planları yüklenemedi:", error);
    }
  };

  const handlePaymentPlanChange = (value: string) => {
    // Check for manual/custom types first
    if (value === "Bireysel" || value === "Atletik Performans") {
      setSelectedPlan(null);
      setFormData(prev => ({
        ...prev,
        payment_plan: value,
        payment_amount: ""
      }));
      return;
    }

    const plan = paymentPlans.find(p => p.name === value);
    if (plan) {
      setSelectedPlan(plan);
      setFormData(prev => ({
        ...prev,
        payment_plan: value,
        payment_amount: plan.price.toString()
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate membership end date based on selected plan duration
      let membershipEndDate = null;
      let secondInstallmentAmount = 0;
      let installmentDate = null;

      if (selectedPlan) {
        const date = new Date();
        date.setMonth(date.getMonth() + selectedPlan.duration_months);
        membershipEndDate = date.toISOString().split('T')[0];

        if (selectedPlan.installments > 1 && selectedPlan.installment_price) {
          secondInstallmentAmount = selectedPlan.installment_price;
          // Default 45 days for second installment
          installmentDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      await studentService.createStudent({
        name: formData.name,
        birth_date: formData.birth_date,
        parent_phone: formData.parent_phone,
        clothing_size: formData.clothing_size,
        work_group_hour: formData.work_group_hour,
        health_report_submitted: formData.health_report_submitted,
        registration_type: formData.registration_type,
        payment_plan: formData.payment_plan,
        payment_amount: formData.payment_amount ? Number(formData.payment_amount) : 0,
        clothing_payment_status: formData.clothing_payment_status,
        payment_status: formData.payment_status,
        status: "Aktif",
        membership_end_date: membershipEndDate,
        second_installment_amount: secondInstallmentAmount,
        installment_date: installmentDate
      } as any);

      toast({
        title: "Başarılı",
        description: "Öğrenci kaydı oluşturuldu.",
      });
      onSuccess();
      onOpenChange(false);
      // Reset form
      setFormData({
        name: "",
        birth_date: "",
        parent_phone: "",
        clothing_size: "",
        work_group_hour: "",
        health_report_submitted: false,
        registration_type: "Yeni Kayıt",
        payment_plan: "",
        payment_amount: "",
        clothing_payment_status: "Ödenmedi",
        payment_status: "Bekliyor"
      });
      setSelectedPlan(null);
    } catch (error) {
      console.error(error);
      toast({
        title: "Hata",
        description: "Kayıt oluşturulurken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const workHours = Array.from({ length: 9 }, (_, i) => {
    const start = 8 + i;
    return `${start.toString().padStart(2, '0')}:00 - ${(start + 1).toString().padStart(2, '0')}:00`;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Öğrenci Kaydı</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Doğum Tarihi</Label>
              <Input 
                type="date"
                required
                value={formData.birth_date}
                onChange={e => setFormData({...formData, birth_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Veli Telefon</Label>
              <Input 
                required
                placeholder="5XX XXX XX XX"
                value={formData.parent_phone}
                onChange={e => setFormData({...formData, parent_phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Kıyafet Bedeni</Label>
              <Select 
                onValueChange={v => setFormData({...formData, clothing_size: v})}
                value={formData.clothing_size}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Beden Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {["110", "128", "140", "152", "164", "XS", "S", "M", "L", "XL"].map(size => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Çalışma Grubu Saati</Label>
            <Select 
              onValueChange={v => setFormData({...formData, work_group_hour: v})}
              value={formData.work_group_hour}
            >
              <SelectTrigger>
                <SelectValue placeholder="Saat Seçin" />
              </SelectTrigger>
              <SelectContent>
                {workHours.map(hour => (
                  <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="health_report"
              checked={formData.health_report_submitted}
              onCheckedChange={(checked) => 
                setFormData({...formData, health_report_submitted: checked as boolean})
              }
            />
            <Label htmlFor="health_report">Sağlık Raporu Teslim Edildi</Label>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-3">Ödeme Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kayıt Tipi</Label>
                <Select 
                  onValueChange={v => setFormData({...formData, registration_type: v})}
                  value={formData.registration_type}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yeni Kayıt">Yeni Kayıt</SelectItem>
                    <SelectItem value="Yenileme">Yenileme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ödeme Planı</Label>
                <Select 
                  onValueChange={handlePaymentPlanChange}
                  value={formData.payment_plan}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Plan Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.name}>
                        {plan.name} ({plan.price.toLocaleString('tr-TR')} TL)
                      </SelectItem>
                    ))}
                    <SelectItem value="Bireysel">Bireysel (Manuel)</SelectItem>
                    <SelectItem value="Atletik Performans">Atletik Performans (Manuel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ödeme Tutarı (TL)</Label>
                <Input 
                  type="number"
                  value={formData.payment_amount}
                  onChange={e => setFormData({...formData, payment_amount: e.target.value})}
                  readOnly={!["Bireysel", "Atletik Performans"].includes(formData.payment_plan)}
                  className={!["Bireysel", "Atletik Performans"].includes(formData.payment_plan) ? "bg-gray-100" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Ödeme Durumu</Label>
                <Select 
                  onValueChange={v => setFormData({...formData, payment_status: v})}
                  value={formData.payment_status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bekliyor">Bekliyor</SelectItem>
                    <SelectItem value="Ödendi">Ödendi</SelectItem>
                    <SelectItem value="Kısmi Ödeme">Kısmi Ödeme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kıyafet Ödemesi (3000 TL)</Label>
                <Select 
                  onValueChange={v => setFormData({...formData, clothing_payment_status: v})}
                  value={formData.clothing_payment_status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ödenmedi">Ödenmedi</SelectItem>
                    <SelectItem value="Ödendi">Ödendi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {selectedPlan?.installments && selectedPlan.installments > 1 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                ℹ️ 2. Taksit ({selectedPlan.installment_price?.toLocaleString('tr-TR')} TL) 45 gün sonrası için planlanacak.
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
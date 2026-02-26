import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { studentService } from "@/services/studentService";
import { groupService } from "@/services/groupService";
import { settingsService, type PaymentPlan } from "@/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  student?: Tables<"students"> | null;
}

export function StudentForm({ open, onOpenChange, onSuccess, student }: StudentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    mother_name: "",
    mother_phone: "",
    father_name: "",
    father_phone: "",
    clothing_size: "",
    work_group_hour: "",
    health_report_submitted: false,
    registration_type: "Yeni Kayıt",
    payment_plan: "",
    payment_amount: "",
    clothing_payment_status: "Ödenmedi",
    payment_status: "Bekliyor",
    registration_start_date: new Date().toISOString().split('T')[0],
    registration_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summer_clothing_paid: false,
    winter_clothing_paid: false,
    summer_clothing_price: "3000",
    winter_clothing_price: "3000"
  });

  useEffect(() => {
    if (open) {
      loadPaymentPlans();
      loadGroups();
      
      // If editing, load student data into form
      if (student) {
        setFormData({
          name: student.name || "",
          birth_date: student.birth_date || "",
          mother_name: student.mother_name || "",
          mother_phone: student.mother_phone || "",
          father_name: student.father_name || "",
          father_phone: student.father_phone || "",
          clothing_size: student.clothing_size || "",
          work_group_hour: student.work_group_hour || "",
          health_report_submitted: student.health_report_submitted || false,
          registration_type: student.registration_type || "Yeni Kayıt",
          payment_plan: student.payment_plan || "",
          payment_amount: student.payment_amount?.toString() || "",
          clothing_payment_status: student.clothing_payment_status || "Ödenmedi",
          payment_status: student.payment_status || "Bekliyor",
          registration_start_date: student.registration_start_date || new Date().toISOString().split('T')[0],
          registration_end_date: student.registration_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          summer_clothing_paid: student.summer_clothing_paid || false,
          winter_clothing_paid: student.winter_clothing_paid || false,
          summer_clothing_price: student.summer_clothing_price?.toString() || "3000",
          winter_clothing_price: student.winter_clothing_price?.toString() || "3000"
        });
      } else {
        // Reset form for new student
        setFormData({
          name: "",
          birth_date: "",
          mother_name: "",
          mother_phone: "",
          father_name: "",
          father_phone: "",
          clothing_size: "",
          work_group_hour: "",
          health_report_submitted: false,
          registration_type: "Yeni Kayıt",
          payment_plan: "",
          payment_amount: "",
          clothing_payment_status: "Ödenmedi",
          payment_status: "Bekliyor",
          registration_start_date: new Date().toISOString().split('T')[0],
          registration_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          summer_clothing_paid: false,
          winter_clothing_paid: false,
          summer_clothing_price: "3000",
          winter_clothing_price: "3000"
        });
      }
    }
  }, [open, student]);

  const loadGroups = async () => {
    try {
      const data = await groupService.getAllGroups();
      setGroups(data);
    } catch (error) {
      console.error("Gruplar yüklenemedi:", error);
    }
  };

  const loadPaymentPlans = async () => {
    try {
      const plans = await settingsService.getPaymentPlans();
      setPaymentPlans(plans);
    } catch (error) {
      console.error("Ödeme planları yüklenemedi:", error);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Auto-assign group based on birth year
  useEffect(() => {
    if (formData.birth_date && !student) { 
      const birthYear = new Date(formData.birth_date).getFullYear().toString();
      
      const matchingGroups = groups.filter(g => 
        g.target_years?.split(',').map((y: string) => y.trim()).includes(birthYear) && g.work_hour
      );

      if (matchingGroups.length > 0) {
        // If exact matches found, prefer them
        const bestMatch = matchingGroups[0];
        setFormData(prev => ({
          ...prev,
          work_group_hour: bestMatch.work_hour
        }));
        
        toast({
          title: "Otomatik Atama",
          description: `${birthYear} doğumlu öğrenci için ${matchingGroups.length} uygun grup bulundu. En uygun saat seçildi.`,
        });
      }
    }
  }, [formData.birth_date, groups]);

  // Auto-calculate end date when start date changes
  useEffect(() => {
    if (formData.registration_start_date) {
      const startDate = new Date(formData.registration_start_date);
      startDate.setFullYear(startDate.getFullYear() + 1);
      setFormData(prev => ({
        ...prev,
        registration_end_date: startDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.registration_start_date]);

  const handlePaymentPlanChange = (value: string) => {
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
    
    if (!formData.name || !formData.birth_date) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.mother_phone && !formData.father_phone) {
      toast({
        title: "Eksik Bilgi",
        description: "En az bir veli telefonu girilmelidir.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let membershipEndDate = null;
      let secondInstallmentAmount = 0;
      let installmentDate = null;

      if (selectedPlan) {
        const date = new Date();
        date.setMonth(date.getMonth() + selectedPlan.duration_months);
        membershipEndDate = date.toISOString().split('T')[0];

        if (selectedPlan.installments > 1 && selectedPlan.installment_price) {
          secondInstallmentAmount = selectedPlan.installment_price;
          installmentDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const age = calculateAge(formData.birth_date);

      const studentData = {
        name: formData.name,
        birth_date: formData.birth_date,
        age: age,
        mother_name: formData.mother_name || null,
        mother_phone: formData.mother_phone || null,
        father_name: formData.father_name || null,
        father_phone: formData.father_phone || null,
        email: null,
        address: null,
        clothing_size: formData.clothing_size || null,
        work_group_hour: formData.work_group_hour || null,
        health_report_submitted: formData.health_report_submitted,
        registration_type: formData.registration_type,
        payment_plan: formData.payment_plan || null,
        payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : null,
        clothing_payment_status: formData.clothing_payment_status,
        payment_status: formData.payment_status,
        status: "Aktif",
        membership_end_date: membershipEndDate,
        second_installment_amount: secondInstallmentAmount || null,
        installment_date: installmentDate,
        registration_start_date: formData.registration_start_date,
        registration_end_date: formData.registration_end_date,
        summer_clothing_paid: formData.summer_clothing_paid,
        winter_clothing_paid: formData.winter_clothing_paid,
        summer_clothing_price: formData.summer_clothing_paid ? parseFloat(formData.summer_clothing_price) : null,
        winter_clothing_price: formData.winter_clothing_paid ? parseFloat(formData.winter_clothing_price) : null
      };

      if (student) {
        // Update existing student
        await studentService.updateStudent(student.id, studentData);
        toast({
          title: "Başarılı",
          description: "Öğrenci bilgileri güncellendi.",
        });
      } else {
        // Create new student
        await studentService.createStudent(studentData);
        toast({
          title: "Başarılı",
          description: "Öğrenci kaydı oluşturuldu.",
        });
      }
      
      setFormData({
        name: "",
        birth_date: "",
        mother_name: "",
        mother_phone: "",
        father_name: "",
        father_phone: "",
        clothing_size: "",
        work_group_hour: "",
        health_report_submitted: false,
        registration_type: "Yeni Kayıt",
        payment_plan: "",
        payment_amount: "",
        clothing_payment_status: "Ödenmedi",
        payment_status: "Bekliyor",
        registration_start_date: new Date().toISOString().split('T')[0],
        registration_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        summer_clothing_paid: false,
        winter_clothing_paid: false,
        summer_clothing_price: "3000",
        winter_clothing_price: "3000"
      });
      setSelectedPlan(null);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Student operation error:", error);
      toast({
        title: "Hata",
        description: error?.message || "İşlem sırasında bir hata oluştu.",
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? "Öğrenci Bilgilerini Düzenle" : "Yeni Öğrenci Kaydı"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Öğrenci Bilgileri */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Öğrenci Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad *</Label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Doğum Tarihi *</Label>
                <Input 
                  type="date"
                  required
                  value={formData.birth_date}
                  onChange={e => setFormData({...formData, birth_date: e.target.value})}
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
                    {/* Show available groups based on birth year first */}
                    {groups
                      .filter(g => !formData.birth_date || g.target_years?.includes(new Date(formData.birth_date).getFullYear().toString()))
                      .filter(g => g.work_hour)
                      .map(group => (
                        <SelectItem key={group.id} value={group.work_hour}>
                          {group.name} ({group.work_hour})
                        </SelectItem>
                    ))}
                    
                    {/* Separator if needed */}
                    {groups.length > 0 && <div className="h-px bg-gray-100 my-1" />}
                    
                    {/* Fallback to standard hours */}
                    {workHours.map(hour => (
                      <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          </div>

          {/* Veli Bilgileri */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Veli Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anne Adı Soyadı</Label>
                <Input 
                  placeholder="Anne adı soyadı"
                  value={formData.mother_name}
                  onChange={e => setFormData({...formData, mother_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Anne Telefonu</Label>
                <Input 
                  placeholder="5XX XXX XX XX"
                  value={formData.mother_phone}
                  onChange={e => setFormData({...formData, mother_phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Baba Adı Soyadı</Label>
                <Input 
                  placeholder="Baba adı soyadı"
                  value={formData.father_name}
                  onChange={e => setFormData({...formData, father_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Baba Telefonu</Label>
                <Input 
                  placeholder="5XX XXX XX XX"
                  value={formData.father_phone}
                  onChange={e => setFormData({...formData, father_phone: e.target.value})}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">* En az bir veli telefonu girilmelidir</p>
          </div>

          {/* Ödeme Bilgileri */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Kayıt Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Kayıt Başlangıç Tarihi *</Label>
                <Input 
                  type="date"
                  required
                  value={formData.registration_start_date}
                  onChange={e => setFormData({...formData, registration_start_date: e.target.value})}
                />
                <p className="text-xs text-gray-500">Ödemelerin başlayacağı tarih</p>
              </div>
              <div className="space-y-2">
                <Label>Kayıt Bitiş Tarihi *</Label>
                <Input 
                  type="date"
                  required
                  value={formData.registration_end_date}
                  onChange={e => setFormData({...formData, registration_end_date: e.target.value})}
                />
                <p className="text-xs text-gray-500">Otomatik: 1 yıl sonrası (değiştirilebilir)</p>
              </div>
            </div>
            
            <h3 className="font-semibold text-lg mb-3 mt-6">Ödeme Bilgileri</h3>
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
            </div>
            
            {selectedPlan?.installments && selectedPlan.installments > 1 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                ℹ️ 2. Taksit ({selectedPlan.installment_price?.toLocaleString('tr-TR')} TL) 45 gün sonrası için planlanacak.
              </div>
            )}
          </div>

          {/* Kıyafet Ödemeleri */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Kıyafet Ödemeleri</h3>
            
            <div className="space-y-4">
              {/* Yazlık Kıyafet */}
              <div className="border rounded-lg p-4 bg-amber-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="summer_clothing"
                      checked={formData.summer_clothing_paid}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, summer_clothing_paid: checked as boolean})
                      }
                    />
                    <Label htmlFor="summer_clothing" className="text-base font-medium cursor-pointer">
                      Yazlık Kıyafet
                    </Label>
                  </div>
                  {formData.summer_clothing_paid && (
                    <span className="text-green-600 font-semibold">✓ Ödendi</span>
                  )}
                </div>
                {formData.summer_clothing_paid && (
                  <div className="space-y-2">
                    <Label className="text-sm">Yazlık Kıyafet Tutarı (TL)</Label>
                    <Input 
                      type="number"
                      value={formData.summer_clothing_price}
                      onChange={e => setFormData({...formData, summer_clothing_price: e.target.value})}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>

              {/* Kışlık Kıyafet */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="winter_clothing"
                      checked={formData.winter_clothing_paid}
                      onCheckedChange={(checked) => 
                        setFormData({...formData, winter_clothing_paid: checked as boolean})
                      }
                    />
                    <Label htmlFor="winter_clothing" className="text-base font-medium cursor-pointer">
                      Kışlık Kıyafet
                    </Label>
                  </div>
                  {formData.winter_clothing_paid && (
                    <span className="text-green-600 font-semibold">✓ Ödendi</span>
                  )}
                </div>
                {formData.winter_clothing_paid && (
                  <div className="space-y-2">
                    <Label className="text-sm">Kışlık Kıyafet Tutarı (TL)</Label>
                    <Input 
                      type="number"
                      value={formData.winter_clothing_price}
                      onChange={e => setFormData({...formData, winter_clothing_price: e.target.value})}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                💡 Her kıyafet tipi için ayrı ödeme takibi yapılır. Ciroda doğru hesaplama için kıyafet ödemelerini işaretleyiniz.
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? (student ? "Güncelleniyor..." : "Kaydediliyor...") : (student ? "Güncelle" : "Kaydı Tamamla")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { studentService } from "@/services/studentService";
import { groupService } from "@/services/groupService";
import { storageService } from "@/services/storageService";
import { settingsService, type PaymentPlan } from "@/services/settingsService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Upload, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";

// Define extended student type with relations
type StudentWithGroups = Tables<"students"> & {
  student_groups?: { group_id: string }[] | null;
};

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  student?: StudentWithGroups | null;
}

export function StudentForm({ open, onOpenChange, onSuccess, student }: StudentFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    height_cm: "",
    weight_kg: "",
    school: "",
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
      loadSchools();
      
      // If editing, load student data into form
      if (student) {
        console.log("Editing student:", student); // Debug log
        
        setFormData({
          name: student.name || "",
          birth_date: student.birth_date || "",
          height_cm: student.height_cm?.toString() || "",
          weight_kg: student.weight_kg?.toString() || "",
          school: student.school || "",
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
        
        // Load student's current group
        if (student.student_groups && student.student_groups.length > 0) {
          setSelectedGroup(student.student_groups[0].group_id);
        }
      } else {
        // Reset form for new student
        console.log("New student form"); // Debug log
        setFormData({
          name: "",
          birth_date: "",
          height_cm: "",
          weight_kg: "",
          school: "",
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
        setSelectedGroup("");
        setSelectedPlan(null);
        setPhotoFile(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }, [open, student]); // Depend on open AND student

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('name')
        .order('name');
      
      if (error) throw error;
      setSchools(data?.map(s => s.name) || []);
    } catch (error) {
      console.error("Okullar yüklenemedi:", error);
    }
  };

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
        const bestMatch = matchingGroups[0];
        setFormData(prev => ({
          ...prev,
          work_group_hour: bestMatch.work_hour
        }));
        
        // Auto-select the group
        setSelectedGroup(bestMatch.id);
        
        toast({
          title: "Otomatik Atama",
          description: `${birthYear} doğumlu öğrenci için ${bestMatch.name} grubu otomatik seçildi.`,
        });
      }
    }
  }, [formData.birth_date, groups, student, toast]);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

    if (!selectedGroup) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen bir grup seçin.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check if school is new and add it to schools table if so
      if (formData.school && !schools.includes(formData.school)) {
        const { error: schoolError } = await supabase
          .from('schools')
          .insert({ name: formData.school })
          .select()
          .single();
          
        if (!schoolError) {
          // Update local schools list without reloading
          setSchools(prev => [...prev, formData.school].sort());
        } else {
          console.error("Error adding new school:", schoolError);
          // Continue anyway, just log the error
        }
      }

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
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        school: formData.school || null,
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

      let studentId;

      if (student) {
        // Update existing student
        await studentService.updateStudent(student.id, studentData);
        studentId = student.id;
        
        // If photo changed, upload new one
        if (photoFile) {
          const photoUrl = await storageService.uploadStudentPhoto(photoFile, studentId);
          await studentService.updateStudent(studentId, { photo_url: photoUrl });
        } else if (photoPreview === null && student.photo_url) {
          await studentService.updateStudent(studentId, { photo_url: null });
        }

        // Update group assignment if changed
        const currentGroupId = student.student_groups?.[0]?.group_id;
        if (selectedGroup !== currentGroupId) {
          // Remove from old group
          if (currentGroupId) {
            await studentService.removeFromGroup(studentId, currentGroupId);
          }
          // Add to new group
          await studentService.assignToGroup(studentId, selectedGroup);
          
          toast({
            title: "Grup Güncellendi",
            description: "Öğrenci yeni gruba başarıyla atandı.",
          });
        }
      } else {
        // Create new student
        const newStudent = await studentService.createStudent(studentData);
        studentId = newStudent.id;

        // Assign to group
        await studentService.assignToGroup(studentId, selectedGroup);

        // If photo selected, upload it
        if (photoFile && studentId) {
          const photoUrl = await storageService.uploadStudentPhoto(photoFile, studentId);
          await studentService.updateStudent(studentId, { photo_url: photoUrl });
        }

        toast({
          title: "Başarılı",
          description: "Öğrenci gruba başarıyla atandı.",
        });
      }
      
      setFormData({
        name: "",
        birth_date: "",
        height_cm: "",
        weight_kg: "",
        school: "",
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
      setSelectedGroup("");
      
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
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative mb-4">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={photoPreview || undefined} className="object-cover" />
                <AvatarFallback className="text-4xl bg-gray-100">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : <Camera className="w-12 h-12 text-gray-400" />}
                </AvatarFallback>
              </Avatar>
              {photoPreview && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 rounded-full w-8 h-8 shadow-md"
                  onClick={handleRemovePhoto}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Fotoğraf Yükle / Çek
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Telefondan çekim yapabilir veya galeriden seçebilirsiniz
            </p>
          </div>

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
                <Label>Boy (cm)</Label>
                <Input 
                  type="number"
                  placeholder="Örn: 145"
                  value={formData.height_cm}
                  onChange={e => setFormData({...formData, height_cm: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Kilo (kg)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  placeholder="Örn: 38.5"
                  value={formData.weight_kg}
                  onChange={e => setFormData({...formData, weight_kg: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Okul</Label>
                <Select 
                  onValueChange={v => setFormData({...formData, school: v})}
                  value={formData.school}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Okul Seçin veya Yazın" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.length === 0 && (
                      <SelectItem value="__new__" disabled>
                        Henüz okul eklenmemiş
                      </SelectItem>
                    )}
                    {schools.map(school => (
                      <SelectItem key={school} value={school}>{school}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="veya yeni okul adı yazın"
                  value={formData.school}
                  onChange={e => setFormData({...formData, school: e.target.value})}
                  className="mt-2"
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
                <Label>Grup Seçimi *</Label>
                <Select 
                  onValueChange={setSelectedGroup}
                  value={selectedGroup}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Grup Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} {group.work_hour ? `(${group.work_hour})` : ''}
                      </SelectItem>
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
                    {groups
                      .filter(g => !formData.birth_date || g.target_years?.includes(new Date(formData.birth_date).getFullYear().toString()))
                      .filter(g => g.work_hour)
                      .map(group => (
                        <SelectItem key={group.id} value={group.work_hour}>
                          {group.name} ({group.work_hour})
                        </SelectItem>
                    ))}
                    
                    {groups.length > 0 && <div className="h-px bg-gray-100 my-1" />}
                    
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
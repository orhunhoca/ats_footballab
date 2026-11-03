import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { groupService } from "@/services/groupService";
import { coachService } from "@/services/coachService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useBranch } from "@/contexts/BranchContext";
import { BranchSelect } from "@/components/BranchSelect";

type Coach = Tables<"coaches">;

type Group = Tables<"groups">;

interface GroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Verilirse form düzenleme modunda açılır ve grubun kayıtlı bilgileriyle dolar */
  group?: Group | null;
}

const EMPTY_FORM = {
  name: "",
  age_group: "",
  target_years: "",
  work_hour: "",
  description: "",
  coach_id: "",
  schedule: "",
  color: "emerald",
  status: "Aktif",
};

/** schedule alanı JSON dizi olarak saklanır; formda satır satır gösterilir */
function scheduleToText(schedule: string | null): string {
  if (!schedule) return "";
  try {
    const parsed = JSON.parse(schedule);
    return Array.isArray(parsed) ? parsed.join("\n") : "";
  } catch {
    return schedule;
  }
}

export function GroupForm({ open, onOpenChange, onSuccess, group }: GroupFormProps) {
  const { toast } = useToast();
  const { defaultBranchId } = useBranch();
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    loadCoaches();
    if (group) {
      setFormData({
        name: group.name || "",
        age_group: group.age_group || "",
        target_years: group.target_years || "",
        work_hour: group.work_hour || "",
        description: group.description || "",
        coach_id: group.coach_id || "",
        schedule: scheduleToText(group.schedule),
        color: group.color || "emerald",
        status: group.status || "Aktif",
      });
      setBranchId(group.branch_id || defaultBranchId);
    } else {
      setFormData(EMPTY_FORM);
      setBranchId(defaultBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group]);

  // Şubeler form açıldıktan sonra yüklenirse varsayılanı doldur
  useEffect(() => {
    if (open && !branchId && defaultBranchId) setBranchId(defaultBranchId);
  }, [open, branchId, defaultBranchId]);

  // Antrenör yalnızca seçilen şubenin antrenörlerinden seçilir
  const branchCoaches = coaches.filter((c) => !branchId || c.branch_id === branchId);

  const handleBranchChange = (id: string) => {
    if (!id) return; // seçenekler yüklenmeden gelen boş değer kayıtlı şubeyi silmesin
    setBranchId(id);
    if (!id || id === branchId || coaches.length === 0) return;
    setFormData((prev) =>
      prev.coach_id && !coaches.some((c) => c.id === prev.coach_id && c.branch_id === id) ? { ...prev, coach_id: "" } : prev,
    );
  };

  const loadCoaches = async () => {
    try {
      const data = await coachService.getAllCoaches();
      setCoaches(data.filter(c => c.status === "Aktif"));
    } catch (error) {
      console.error("Error loading coaches:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!branchId) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen grubun şubesini seçin.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name || !formData.age_group) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const scheduleArray = formData.schedule
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        branch_id: branchId,
        name: formData.name.trim(),
        age_group: formData.age_group.trim(),
        target_years: formData.target_years,
        work_hour: formData.work_hour,
        description: formData.description || null,
        coach_id: formData.coach_id || null,
        schedule: JSON.stringify(scheduleArray),
        color: formData.color,
        status: formData.status
      };
      if (group) {
        await groupService.updateGroup(group.id, payload);
      } else {
        await groupService.createGroup(payload);
      }

      toast({
        title: "Başarılı",
        description: group ? "Grup bilgileri güncellendi." : "Grup kaydı oluşturuldu.",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Group save error:", error);
      toast({
        title: "Hata",
        description: error?.message || "Kayıt oluşturulurken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Grubu Düzenle" : "Yeni Grup Oluştur"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BranchSelect value={branchId} onChange={handleBranchChange} />

          <div className="space-y-2">
            <Label>Grup Adı *</Label>
            <Input 
              required
              placeholder="Örn: U12 Takımı"
              value={formData.name}
              onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
            />
          </div>

          <div className="space-y-2">
            <Label>Yaş Grubu *</Label>
            <Input 
              required
              placeholder="Örn: U12 (2014-2015)"
              value={formData.age_group}
              onChange={e => setFormData(prev => ({...prev, age_group: e.target.value}))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hedef Doğum Yılları</Label>
              <Input 
                placeholder="Örn: 2014, 2015"
                value={formData.target_years}
                onChange={e => setFormData(prev => ({...prev, target_years: e.target.value}))}
              />
              <p className="text-xs text-muted-foreground">Virgülle ayırarak yazın.</p>
            </div>

            <div className="space-y-2">
              <Label>Çalışma Saati</Label>
              <Input 
                type="time"
                value={formData.work_hour}
                onChange={e => setFormData(prev => ({...prev, work_hour: e.target.value}))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea 
              placeholder="Grup hakkında açıklama..."
              value={formData.description}
              onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Antrenör</Label>
            <Select 
              onValueChange={v => v && setFormData(prev => ({...prev, coach_id: v}))}
              value={formData.coach_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Antrenör Seçin" />
              </SelectTrigger>
              <SelectContent>
                {branchCoaches.map(coach => (
                  <SelectItem key={coach.id} value={coach.id}>
                    {coach.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Antrenman Programı</Label>
            <Textarea 
              placeholder="Her satıra bir antrenman saati yazın&#10;Örn:&#10;Pazartesi 17:00-18:30&#10;Çarşamba 17:00-18:30"
              value={formData.schedule}
              onChange={e => setFormData(prev => ({...prev, schedule: e.target.value}))}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Renk Teması</Label>
              <Select 
                onValueChange={v => v && setFormData(prev => ({...prev, color: v}))}
                value={formData.color}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emerald">Yeşil</SelectItem>
                  <SelectItem value="blue">Mavi</SelectItem>
                  <SelectItem value="red">Kırmızı</SelectItem>
                  <SelectItem value="amber">Turuncu</SelectItem>
                  <SelectItem value="purple">Mor</SelectItem>
                  <SelectItem value="pink">Pembe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select 
                onValueChange={v => v && setFormData(prev => ({...prev, status: v}))}
                value={formData.status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Pasif">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Kaydediliyor..." : group ? "Kaydet" : "Grubu Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
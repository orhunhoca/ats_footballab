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

type Coach = Tables<"coaches">;

interface GroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GroupForm({ open, onOpenChange, onSuccess }: GroupFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    age_group: "",
    description: "",
    coach_id: "",
    schedule: "",
    color: "emerald",
    status: "Aktif"
  });

  useEffect(() => {
    if (open) {
      loadCoaches();
    }
  }, [open]);

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

      await groupService.createGroup({
        name: formData.name,
        age_group: formData.age_group,
        description: formData.description || null,
        coach_id: formData.coach_id || null,
        schedule: JSON.stringify(scheduleArray),
        color: formData.color,
        status: formData.status
      });

      toast({
        title: "Başarılı",
        description: "Grup kaydı oluşturuldu.",
      });
      
      setFormData({
        name: "",
        age_group: "",
        description: "",
        coach_id: "",
        schedule: "",
        color: "emerald",
        status: "Aktif"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Group creation error:", error);
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
          <DialogTitle>Yeni Grup Oluştur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Grup Adı *</Label>
            <Input 
              required
              placeholder="Örn: U12 Takımı"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Yaş Grubu *</Label>
            <Input 
              required
              placeholder="Örn: 10-12 Yaş"
              value={formData.age_group}
              onChange={e => setFormData({...formData, age_group: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea 
              placeholder="Grup hakkında açıklama..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Antrenör</Label>
            <Select 
              onValueChange={v => setFormData({...formData, coach_id: v})}
              value={formData.coach_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Antrenör Seçin" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map(coach => (
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
              onChange={e => setFormData({...formData, schedule: e.target.value})}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Renk Teması</Label>
              <Select 
                onValueChange={v => setFormData({...formData, color: v})}
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
                onValueChange={v => setFormData({...formData, status: v})}
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
              {loading ? "Kaydediliyor..." : "Grubu Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
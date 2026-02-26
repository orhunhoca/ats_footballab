import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { coachService } from "@/services/coachService";
import { useToast } from "@/hooks/use-toast";

interface CoachFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CoachForm({ open, onOpenChange, onSuccess }: CoachFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialty: "",
    experience: "",
    license: "",
    status: "Aktif"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await coachService.createCoach({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        specialty: formData.specialty || null,
        experience: formData.experience || null,
        license: formData.license || null,
        status: formData.status
      });

      toast({
        title: "Başarılı",
        description: "Antrenör kaydı oluşturuldu.",
      });
      
      setFormData({
        name: "",
        phone: "",
        email: "",
        specialty: "",
        experience: "",
        license: "",
        status: "Aktif"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Coach creation error:", error);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Antrenör Kaydı</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad Soyad *</Label>
            <Input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefon *</Label>
              <Input 
                required
                placeholder="5XX XXX XX XX"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input 
                type="email"
                placeholder="ornek@email.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Uzmanlık</Label>
            <Input 
              placeholder="Örn: Kaleci Antrenörü"
              value={formData.specialty}
              onChange={e => setFormData({...formData, specialty: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deneyim</Label>
              <Input 
                placeholder="Örn: 5 Yıl"
                value={formData.experience}
                onChange={e => setFormData({...formData, experience: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Lisans</Label>
              <Select 
                onValueChange={v => setFormData({...formData, license: v})}
                value={formData.license}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lisans Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UEFA A">UEFA A</SelectItem>
                  <SelectItem value="UEFA B">UEFA B</SelectItem>
                  <SelectItem value="UEFA C">UEFA C</SelectItem>
                  <SelectItem value="TFF A">TFF A</SelectItem>
                  <SelectItem value="TFF B">TFF B</SelectItem>
                  <SelectItem value="TFF C">TFF C</SelectItem>
                  <SelectItem value="Diğer">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
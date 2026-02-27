import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { coachService } from "@/services/coachService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

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
    password: "",
    specialty: "",
    experience: "",
    license: "",
    status: "Aktif"
  });

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({...formData, password});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen tüm zorunlu alanları doldurun.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Geçersiz Email",
        description: "Lütfen geçerli bir email adresi girin.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Supabase Auth user
      const { user, error: authError } = await authService.signUp(
        formData.email,
        formData.password
      );

      if (authError) {
        throw new Error(`Hesap oluşturulamadı: ${authError.message}`);
      }

      if (!user) {
        throw new Error("Kullanıcı oluşturulamadı");
      }

      // Step 2: Create profile with coach role
      const { error: profileError } = await authService.createProfile(user.id, {
        email: formData.email,
        full_name: formData.name,
        role: "coach"
      });

      if (profileError) {
        throw new Error(`Profil oluşturulamadı: ${profileError.message}`);
      }

      // Step 3: Create coach record
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days

      await coachService.createCoach({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        specialty: formData.specialty || null,
        experience: formData.experience || null,
        license: formData.license || null,
        status: formData.status,
        user_id: user.id,
        invite_status: "Pending",
        invite_token: inviteToken,
        invite_sent_at: new Date().toISOString(),
        invite_expires_at: inviteExpiresAt.toISOString()
      });

      toast({
        title: "Davetiye Gönderildi! 📧",
        description: `${formData.name} adresine davetiye maili gönderildi. Antrenör maildeki linke tıklayarak hesabını aktive edebilir.`,
      });
      
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
        specialty: "",
        experience: "",
        license: "",
        status: "Aktif"
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Coach invitation error:", error);
      toast({
        title: "Hata",
        description: error?.message || "Davetiye gönderilirken bir hata oluştu.",
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
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            Antrenör Davet Et
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Antrenöre email ile davetiye gönderilecek. Davetiye linkine tıklayarak hesabını aktive edebilir.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Ad Soyad *</Label>
            <Input 
              required
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>E-posta * (Giriş için kullanılacak)</Label>
            <Input 
              required
              type="email"
              placeholder="ornek@email.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <p className="text-xs text-gray-500">Bu adrese davetiye maili gönderilecek</p>
          </div>

          <div className="space-y-2">
            <Label>Geçici Şifre *</Label>
            <div className="flex gap-2">
              <Input 
                required
                type="text"
                placeholder="Güçlü bir şifre girin"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={generateRandomPassword}
              >
                Oluştur
              </Button>
            </div>
            <p className="text-xs text-gray-500">Antrenör ilk girişte şifresini değiştirebilir</p>
          </div>

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

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Davetiye Gönderiliyor...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Davetiye Gönder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
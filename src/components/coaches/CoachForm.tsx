import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { coachService } from "@/services/coachService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, RefreshCw, Copy, CheckCircle2 } from "lucide-react";

interface CoachFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CoachForm({ open, onOpenChange, onSuccess }: CoachFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialty: "",
    experience: "",
    license: "",
    status: "Aktif"
  });

  // Cooldown timer
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    const length = 12;
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({...formData, password});
    setShowPassword(true);
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(formData.password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
    toast({
      title: "Kopyalandı!",
      description: "Geçici şifre panoya kopyalandı.",
    });
  };

  useEffect(() => {
    if (open && !formData.password) {
      generateRandomPassword();
    }
  }, [open]);

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
      const { data: authData, error: authError } = await authService.signUp(
        formData.email,
        formData.password
      );

      if (authError) throw authError;

      if (authData.user) {
        await coachService.createCoach({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          specialty: formData.specialty || null,
          experience: formData.experience || null,
          license: formData.license || null,
          status: formData.status,
          user_id: authData.user.id,
          invite_status: "accepted",
          invite_token: null,
          invite_sent_at: null,
          invite_expires_at: null
        });

        toast({
          title: "✅ Antrenör Başarıyla Eklendi!",
          description: `${formData.name} kaydedildi. Geçici şifre ile giriş yapabilir.`,
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
      }
    } catch (error: any) {
      console.error("Coach creation error:", error);
      
      if (error?.message?.includes("User already registered")) {
        toast({
          title: "Email Zaten Kayıtlı",
          description: "Bu email adresi ile kayıtlı bir kullanıcı zaten var.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Hata",
          description: error?.message || "Antrenör eklenirken bir hata oluştu.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Antrenör Ekle</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Geçici şifre ile hesap oluşturulacak. Antrenör ilk girişte şifresini değiştirebilir.
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
          </div>

          <div className="space-y-2">
            <Label>Geçici Şifre *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateRandomPassword}
                title="Yeni şifre oluştur"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyPassword}
                title="Şifreyi kopyala"
              >
                {passwordCopied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-600">
              ⚠️ Bu şifreyi antrenöre iletin. İlk girişte değiştirebilir.
            </p>
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
                  Ekleniyor...
                </>
              ) : (
                "Antrenör Ekle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
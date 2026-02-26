import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trialStudentService } from "@/services/trialStudentService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface ConvertToStudentDialogProps {
  trialStudent: Tables<"trial_students">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConvertToStudentDialog({ trialStudent, open, onOpenChange, onSuccess }: ConvertToStudentDialogProps) {
  const [formData, setFormData] = useState({
    mother_name: trialStudent.parent_name,
    mother_phone: trialStudent.parent_phone,
    father_name: "",
    father_phone: "",
    address: "",
    health_report: "Yok",
    registration_type: "Yeni Kayıt",
    payment_plan: "Peşin",
    payment_amount: "0",
    registration_start_date: new Date().toISOString().split("T")[0],
    registration_end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await trialStudentService.convertToFullStudent(trialStudent.id, formData);

      toast({
        title: "Başarılı",
        description: "Öğrenci başarıyla kayıt edildi."
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kayıt işlemi başarısız oldu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Öğrenciyi Kaydet: {trialStudent.name}</DialogTitle>
          <DialogDescription>
            Tam kayıt için ek bilgileri doldurun
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Veli Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mother_name">Anne Adı</Label>
                <Input
                  id="mother_name"
                  value={formData.mother_name}
                  onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_phone">Anne Telefonu</Label>
                <Input
                  id="mother_phone"
                  value={formData.mother_phone}
                  onChange={(e) => setFormData({ ...formData, mother_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_name">Baba Adı</Label>
                <Input
                  id="father_name"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_phone">Baba Telefonu</Label>
                <Input
                  id="father_phone"
                  value={formData.father_phone}
                  onChange={(e) => setFormData({ ...formData, father_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          {/* Health Report */}
          <div className="space-y-2">
            <Label htmlFor="health_report">Sağlık Raporu</Label>
            <Select
              value={formData.health_report}
              onValueChange={(value) => setFormData({ ...formData, health_report: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yok">Yok</SelectItem>
                <SelectItem value="Var">Var</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Information */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Ödeme Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_plan">Ödeme Planı</Label>
                <Select
                  value={formData.payment_plan}
                  onValueChange={(value) => setFormData({ ...formData, payment_plan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Peşin">Peşin</SelectItem>
                    <SelectItem value="2 Taksit">2 Taksit</SelectItem>
                    <SelectItem value="3 Taksit">3 Taksit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Ödeme Tutarı (₺)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Registration Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registration_start_date">Kayıt Başlangıç</Label>
              <Input
                id="registration_start_date"
                type="date"
                value={formData.registration_start_date}
                onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_end_date">Kayıt Bitiş</Label>
              <Input
                id="registration_end_date"
                type="date"
                value={formData.registration_end_date}
                onChange={(e) => setFormData({ ...formData, registration_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
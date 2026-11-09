import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trialStudentService } from "@/services/trialStudentService";
import { capacityErrorMessage, isFull, remaining } from "@/lib/groupRules";
import { recommendGroups } from "@/lib/groupRecommendation";
import { useGroupDirectory } from "@/hooks/useGroupDirectory";
import { GroupRecommendations } from "@/components/groups/GroupRecommendations";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

import { BranchSelect } from "@/components/BranchSelect";
import { useBranchPermission } from "@/hooks/useBranchPermission";

type Group = Tables<"groups">;

interface TrialStudentFormProps {
  onSuccess: () => void;
}

export function TrialStudentForm({ onSuccess }: TrialStudentFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    birth_date: "",
    parent_name: "",
    parent_phone: "",
    age_group: "",
    assigned_group_id: "",
    trial_date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const { groups, occupancy, sessions, fields, reload: reloadGroups } = useGroupDirectory();
  const lastRecKey = useRef("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { locked: branchLocked, formDefaultBranchId: defaultBranchId } = useBranchPermission();
  const [branchId, setBranchId] = useState(defaultBranchId);

  // Şubeler yüklendikten sonra varsayılanı doldur
  useEffect(() => {
    if (!branchId && defaultBranchId) setBranchId(defaultBranchId);
  }, [branchId, defaultBranchId]);

  // Seçilen şubeye ait gruplar
  const branchGroups = groups.filter((g) => !branchId || g.branch_id === branchId);

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    setFormData((prev) =>
      prev.assigned_group_id && !groups.some((g) => g.id === prev.assigned_group_id && g.branch_id === id)
        ? { ...prev, assigned_group_id: "" }
        : prev
    );
  };

  useEffect(() => {
    if (formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      let ageGroup = "";
      if (age <= 6) ageGroup = "U6";
      else if (age <= 7) ageGroup = "U7";
      else if (age <= 8) ageGroup = "U8";
      else if (age <= 9) ageGroup = "U9";
      else if (age <= 10) ageGroup = "U10";
      else if (age <= 11) ageGroup = "U11";
      else if (age <= 12) ageGroup = "U12";
      else if (age <= 13) ageGroup = "U13";
      else if (age <= 14) ageGroup = "U14";
      else if (age <= 15) ageGroup = "U15";
      else ageGroup = "U16+";

      setFormData(prev => ({ ...prev, age_group: ageGroup }));

      // Doğum yılına uyan, kontenjanı olan en uygun grup (öneri listesinin başı).
      // Doğum tarihi/şube değişince yeniden önerilir; aksi halde kullanıcının seçimi korunur (yalnız boşsa doldurulur).
      const key = `${formData.birth_date}|${branchId}`;
      const keyChanged = lastRecKey.current !== key;
      lastRecKey.current = key;
      const top = recommendGroups(formData.birth_date, branchId, groups, occupancy).available[0];
      setFormData((prev) => (keyChanged || !prev.assigned_group_id ? { ...prev, assigned_group_id: top ? top.id : "" } : prev));
    }
  }, [formData.birth_date, groups, branchId, occupancy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen şubeyi seçin.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);

    try {
      await trialStudentService.createTrialStudent({
        branch_id: branchId,
        name: formData.name,
        birth_date: formData.birth_date,
        parent_name: formData.parent_name,
        parent_phone: formData.parent_phone,
        age_group: formData.age_group,
        assigned_group_id: formData.assigned_group_id || null,
        trial_date: formData.trial_date,
        notes: formData.notes || null,
        status: "Beklemede"
      });

      toast({
        title: "Başarılı",
        description: "Deneme öğrenci başarıyla eklendi."
      });

      setFormData({
        name: "",
        birth_date: "",
        parent_name: "",
        parent_phone: "",
        age_group: "",
        assigned_group_id: "",
        trial_date: new Date().toISOString().split("T")[0],
        notes: ""
      });

      onSuccess();
    } catch (error) {
      const full = capacityErrorMessage(error);
      toast({
        title: full ? "Kontenjan dolu" : "Hata",
        description: full ?? "Deneme öğrenci eklenirken bir hata oluştu.",
        variant: "destructive"
      });
      if (full) await reloadGroups(); // doluluk güncellensin
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BranchSelect value={branchId} onChange={handleBranchChange} disabled={branchLocked} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Ad Soyad *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Doğum Tarihi *</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="parent_name">Veli Adı *</Label>
          <Input
            id="parent_name"
            value={formData.parent_name}
            onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parent_phone">Veli Telefonu *</Label>
          <Input
            id="parent_phone"
            type="tel"
            value={formData.parent_phone}
            onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
            required
          />
        </div>
      </div>

      {formData.birth_date && (
        <GroupRecommendations
          birthDate={formData.birth_date}
          branchId={branchId}
          groups={groups}
          occupancy={occupancy}
          sessions={sessions}
          fields={fields}
          selectedId={formData.assigned_group_id}
          onSelect={(id) => setFormData((prev) => ({ ...prev, assigned_group_id: id }))}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age_group">Yaş Grubu</Label>
          <Input
            id="age_group"
            value={formData.age_group}
            readOnly
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_group">Atanacak Grup</Label>
          <Select
            value={formData.assigned_group_id}
            onValueChange={(value) => setFormData({ ...formData, assigned_group_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Grup seçin" />
            </SelectTrigger>
            <SelectContent>
              {branchGroups
                .filter((g) => g.status === "Aktif")
                .map((group) => {
                  const full = isFull(occupancy[group.id]);
                  const left = remaining(occupancy[group.id]);
                  return (
                    <SelectItem key={group.id} value={group.id} disabled={full}>
                      {group.name} ({group.age_group}){group.work_hour ? ` · ${group.work_hour}` : ""}
                      {full ? " — DOLU" : left != null ? ` — ${left} yer kaldı` : ""}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="trial_date">Deneme Antrenman Tarihi</Label>
        <Input
          id="trial_date"
          type="date"
          value={formData.trial_date}
          onChange={(e) => setFormData({ ...formData, trial_date: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notlar</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Deneme antrenman hakkında notlar..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
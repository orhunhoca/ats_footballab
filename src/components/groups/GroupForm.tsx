import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { groupService } from "@/services/groupService";
import { coachService } from "@/services/coachService";
import { fieldService, formatFieldHours, type BranchField } from "@/services/fieldService";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useBranch } from "@/contexts/BranchContext";
import { BranchSelect } from "@/components/BranchSelect";
import { addMinutes, birthYearsForAges, DAYS, formatSession, hhmm, sortSessions, type Session } from "@/lib/groupRules";

type Coach = Tables<"coaches"> & { coach_branches?: { branch_id: string }[] };
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
  age_min: "",
  age_max: "",
  description: "",
  coach_id: "",
  field_id: "",
  capacity: "",
  color: "emerald",
  status: "Aktif",
};

interface SessionRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DEFAULT_SESSION: SessionRow = { day_of_week: 1, start_time: "17:00", end_time: "18:00" };

export function GroupForm({ open, onOpenChange, onSuccess, group }: GroupFormProps) {
  const { toast } = useToast();
  const { defaultBranchId } = useBranch();
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [fields, setFields] = useState<BranchField[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([DEFAULT_SESSION]);
  const [originalSessions, setOriginalSessions] = useState<Session[]>([]);
  const [labelTouched, setLabelTouched] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    loadCoaches();
    if (group) {
      setFormData({
        name: group.name || "",
        age_group: group.age_group || "",
        age_min: group.age_min != null ? String(group.age_min) : "",
        age_max: group.age_max != null ? String(group.age_max) : "",
        description: group.description || "",
        coach_id: group.coach_id || "",
        field_id: group.field_id || "",
        capacity: group.capacity != null ? String(group.capacity) : "",
        color: group.color || "emerald",
        status: group.status || "Aktif",
      });
      setLabelTouched(true);
      setBranchId(group.branch_id || defaultBranchId);
      groupService
        .getSessions(group.id)
        .then((s) => {
          setOriginalSessions(s);
          setSessions(s.length > 0 ? sortSessions(s).map((x) => ({ day_of_week: x.day_of_week, start_time: hhmm(x.start_time), end_time: hhmm(x.end_time) })) : [DEFAULT_SESSION]);
        })
        .catch(() => setSessions([DEFAULT_SESSION]));
    } else {
      setFormData(EMPTY_FORM);
      setLabelTouched(false);
      setSessions([DEFAULT_SESSION]);
      setOriginalSessions([]);
      setBranchId(defaultBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group]);

  // Şubeler form açıldıktan sonra yüklenirse varsayılanı doldur
  useEffect(() => {
    if (open && !branchId && defaultBranchId) setBranchId(defaultBranchId);
  }, [open, branchId, defaultBranchId]);

  // Şubenin sahaları
  useEffect(() => {
    if (!open || !branchId) {
      setFields([]);
      return;
    }
    fieldService
      .list(branchId)
      .then((list) => setFields(list.filter((f) => f.is_active || f.id === group?.field_id)))
      .catch(() => setFields([]));
  }, [open, branchId, group?.field_id]);

  const loadCoaches = async () => {
    try {
      const data = await coachService.getAllCoaches();
      setCoaches(data.filter((c) => c.status === "Aktif") as Coach[]);
    } catch (error) {
      console.error("Error loading coaches:", error);
    }
  };

  const worksInBranch = (c: Coach, id: string) => c.branch_id === id || (c.coach_branches ?? []).some((cb) => cb.branch_id === id);
  const branchCoaches = coaches.filter((c) => branchId && worksInBranch(c, branchId));
  const otherCoaches = coaches.filter((c) => !branchId || !worksInBranch(c, branchId));

  const field = fields.find((f) => f.id === formData.field_id);

  const handleBranchChange = (id: string) => {
    if (!id || id === branchId) return; // seçenekler yüklenmeden gelen boş değer kayıtlı şubeyi silmesin
    setBranchId(id);
    setFormData((prev) => ({ ...prev, field_id: "" })); // saha şubeye bağlıdır
  };

  const ageMin = formData.age_min === "" ? null : Number(formData.age_min);
  const ageMax = formData.age_max === "" ? null : Number(formData.age_max);

  // Yaş grubu etiketi: kullanıcı elle değiştirmediyse yaş aralığından üretilir
  useEffect(() => {
    if (labelTouched || ageMin == null || ageMax == null) return;
    const years = birthYearsForAges(ageMin, ageMax);
    const label = `U${ageMax + 1} (${years[years.length - 1]}${years.length > 1 ? `-${years[0]}` : ""})`;
    setFormData((prev) => (prev.age_group === label ? prev : { ...prev, age_group: label }));
  }, [ageMin, ageMax, labelTouched]);

  const updateSession = (i: number, patch: Partial<SessionRow>) =>
    setSessions((prev) =>
      prev.map((s, k) => {
        if (k !== i) return s;
        const next = { ...s, ...patch };
        // Başlangıç değişince bitiş (varsayılan 1 saat) kayar
        if (patch.start_time && patch.end_time === undefined) next.end_time = addMinutes(patch.start_time, 60);
        return next;
      })
    );

  const problems = useMemo(() => {
    const out: string[] = [];
    const cap = Number(formData.capacity);
    if (field && formData.capacity !== "" && cap > field.capacity) out.push(`Kontenjan, sahanın 1 saatlik kontenjanını (${field.capacity}) aşamaz.`);
    if (field) {
      for (const s of sessions) {
        if (s.end_time <= s.start_time) out.push("Bitiş saati başlangıçtan sonra olmalı.");
        else if (s.start_time < hhmm(field.open_time) || s.end_time > hhmm(field.close_time)) {
          out.push(`${formatSession({ ...s })} saati ${field.name} sahasının çalışma saatleri (${formatFieldHours(field)}) dışında.`);
        }
      }
    }
    if (ageMin != null && ageMax != null && ageMax < ageMin) out.push("En büyük yaş, en küçük yaştan küçük olamaz.");
    const keys = sessions.map((s) => `${s.day_of_week}-${s.start_time}`);
    if (new Set(keys).size !== keys.length) out.push("Aynı gün ve saat iki kez girilmiş.");
    return Array.from(new Set(out));
  }, [field, formData.capacity, sessions, ageMin, ageMax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fail = (description: string) => toast({ title: "Eksik Bilgi", description, variant: "destructive" });
    if (!branchId) return fail("Lütfen grubun şubesini seçin.");
    if (!formData.name.trim() || !formData.age_group.trim()) return fail("Grup adı ve yaş grubu zorunludur.");
    if (ageMin == null || ageMax == null) return fail("Yaş aralığını (en küçük ve en büyük yaş) girin.");
    if (!formData.field_id) return fail("Antrenmanın yapılacağı sahayı seçin.");
    const cap = Number(formData.capacity);
    if (!Number.isInteger(cap) || cap < 1) return fail("Grup kontenjanını girin (en az 1).");
    if (!formData.coach_id) return fail("Bu antrenman saatine bir antrenör atamalısınız.");
    if (sessions.length === 0) return fail("En az bir antrenman günü ve saati ekleyin.");
    if (problems.length > 0) {
      toast({ title: "Düzeltilmesi gerekenler", description: problems[0], variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const ordered = sortSessions(sessions.map((s) => ({ ...s })));
      const years = birthYearsForAges(ageMin, ageMax);

      const payload = {
        branch_id: branchId,
        name: formData.name.trim(),
        age_group: formData.age_group.trim(),
        age_min: ageMin,
        age_max: ageMax,
        target_years: years.join(", "),
        field_id: formData.field_id,
        capacity: cap,
        // Eski ekranlar ve belgeler için: ilk seansın başlangıcı ve metin programı
        work_hour: ordered[0].start_time,
        schedule: JSON.stringify(ordered.map((s) => formatSession(s))),
        description: formData.description || null,
        coach_id: formData.coach_id,
        color: formData.color,
        status: formData.status,
      };

      if (group) {
        await groupService.updateGroup(group.id, payload);
        await groupService.replaceSessions(group.id, ordered, originalSessions);
      } else {
        const created = await groupService.createGroup(payload);
        try {
          await groupService.replaceSessions(created.id, ordered, []);
        } catch (sessionError) {
          // Yarım grup kalmasın
          await groupService.deleteGroup(created.id).catch(() => undefined);
          throw sessionError;
        }
      }

      toast({
        title: "Başarılı",
        description: group ? "Grup bilgileri güncellendi." : "Grup kaydı oluşturuldu.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Group save error:", error);
      toast({
        title: "Grup kaydedilemedi",
        description: (error as { message?: string })?.message || "Kayıt oluşturulurken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const noFields = !!branchId && fields.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{group ? "Grubu Düzenle" : "Yeni Antrenman Grubu"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BranchSelect value={branchId} onChange={handleBranchChange} />

          <div className="space-y-2">
            <Label>Grup Adı *</Label>
            <Input required placeholder="Örn: U12 Takımı" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>En küçük yaş *</Label>
              <Input type="number" min={3} max={25} value={formData.age_min} onChange={(e) => setFormData((prev) => ({ ...prev, age_min: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>En büyük yaş *</Label>
              <Input type="number" min={3} max={25} value={formData.age_max} onChange={(e) => setFormData((prev) => ({ ...prev, age_max: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Yaş grubu etiketi *</Label>
            <Input
              required
              placeholder="Örn: U12 (2014-2015)"
              value={formData.age_group}
              onChange={(e) => {
                setLabelTouched(true);
                setFormData((prev) => ({ ...prev, age_group: e.target.value }));
              }}
            />
            <p className="text-xs text-muted-foreground">Öğrenci atanırken yaşı bu aralığa uyanlar öne çıkar (aynı yaş grubu birden fazla sahada ayrı gruplar olarak açılabilir).</p>
          </div>

          {noFields && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Bu şubede aktif saha yok. Ayarlar → Okul Ayarları → Şubeler bölümünden saha ekleyin.</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Saha *</Label>
              <Select value={formData.field_id} onValueChange={(v) => v && setFormData((prev) => ({ ...prev, field_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Saha seçin" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({formatFieldHours(f)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kontenjan *</Label>
              <Input
                type="number"
                min={1}
                max={field?.capacity}
                inputMode="numeric"
                placeholder={field ? `en çok ${field.capacity}` : "öğrenci sayısı"}
                value={formData.capacity}
                onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
              />
            </div>
          </div>
          {field && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {field.name}: {formatFieldHours(field)} arası açık, aynı saatte en çok {field.capacity} öğrenci. Aynı saatte sahada başka gruplar varsa kontenjanlarının toplamı bu sayıyı aşamaz.
            </p>
          )}

          <div className="space-y-2">
            <Label>Antrenör *</Label>
            <Select value={formData.coach_id} onValueChange={(v) => v && setFormData((prev) => ({ ...prev, coach_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Bu antrenman saatinin antrenörü" />
              </SelectTrigger>
              <SelectContent>
                {branchCoaches.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Bu şubenin antrenörleri</SelectLabel>
                    {branchCoaches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {otherCoaches.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Sistemdeki diğer antrenörler</SelectLabel>
                    {otherCoaches.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Aynı antrenör aynı gün ve saatte iki grupta görevlendirilemez.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Haftalık antrenman saatleri *</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setSessions((p) => [...p, { ...DEFAULT_SESSION }])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Gün ekle
              </Button>
            </div>
            {sessions.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                <Select value={String(s.day_of_week)} onValueChange={(v) => v && updateSession(i, { day_of_week: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="time" className="w-[110px]" value={s.start_time} onChange={(e) => e.target.value && updateSession(i, { start_time: e.target.value })} />
                <Input type="time" className="w-[110px]" value={s.end_time} onChange={(e) => e.target.value && updateSession(i, { end_time: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" aria-label="Günü kaldır" disabled={sessions.length === 1} onClick={() => setSessions((p) => p.filter((_, k) => k !== i))}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>

          {problems.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea placeholder="Grup hakkında açıklama..." value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Renk Teması</Label>
              <Select onValueChange={(v) => v && setFormData((prev) => ({ ...prev, color: v }))} value={formData.color}>
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
              <Select onValueChange={(v) => v && setFormData((prev) => ({ ...prev, status: v }))} value={formData.status}>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={loading || noFields} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Kaydediliyor..." : group ? "Kaydet" : "Grubu Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash2, Power, Landmark, FileText } from "lucide-react";
import { companyService, type BankAccount, type CompanyFormValues, type CompanySettings } from "@/services/companyService";
import { useBranch } from "@/contexts/BranchContext";
import { formatIban, isValidTrIban } from "@/lib/iban";
import { useToast } from "@/hooks/use-toast";

const ALL_BRANCHES = "__all__";
const emptyCompany: CompanyFormValues = {
  legal_name: "",
  tax_office: "",
  tax_number: "",
  mersis_no: "",
  address: "",
  phone: "",
  email: "",
  kep_address: "",
  website: "",
  kvkk_contact_email: "",
  verbis_number: "",
};
const emptyBank = { bank_name: "", account_holder: "", iban: "", bank_branch: "", description: "", branch_id: ALL_BRANCHES };

/**
 * Ayarlar → Şirket ve Banka: şirket bilgileri (KVKK/çerez metinlerine otomatik yansır)
 * ve ödeme alınan banka hesapları (IBAN). Yalnızca admin düzenler.
 */
export function CompanyBankSettings() {
  const { toast } = useToast();
  const { branches, getBranchName } = useBranch();

  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [form, setForm] = useState<CompanyFormValues>(emptyCompany);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bankOpen, setBankOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [bankForm, setBankForm] = useState(emptyBank);
  const [savingBank, setSavingBank] = useState(false);
  const [toDelete, setToDelete] = useState<BankAccount | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [c, b] = await Promise.all([companyService.getCompany(), companyService.getBankAccounts()]);
      setCompany(c);
      if (c) {
        setForm({
          legal_name: c.legal_name ?? "",
          tax_office: c.tax_office ?? "",
          tax_number: c.tax_number ?? "",
          mersis_no: c.mersis_no ?? "",
          address: c.address ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          kep_address: c.kep_address ?? "",
          website: c.website ?? "",
          kvkk_contact_email: c.kvkk_contact_email ?? "",
          verbis_number: c.verbis_number ?? "",
        });
      }
      setAccounts(b);
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Şirket ve banka bilgileri yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof CompanyFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSavingCompany(true);
    try {
      await companyService.saveCompany(company.id, form);
      toast({ title: "Kaydedildi", description: "Şirket bilgileri güncellendi; KVKK ve çerez metinlerine yansıdı." });
      await load();
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Şirket bilgileri kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const openBank = (acc?: BankAccount) => {
    setEditing(acc ?? null);
    setBankForm(
      acc
        ? {
            bank_name: acc.bank_name,
            account_holder: acc.account_holder,
            iban: formatIban(acc.iban),
            bank_branch: acc.bank_branch ?? "",
            description: acc.description ?? "",
            branch_id: acc.branch_id ?? ALL_BRANCHES,
          }
        : { ...emptyBank, account_holder: form.legal_name ?? "" }
    );
    setBankOpen(true);
  };

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_holder.trim() || !bankForm.iban.trim()) {
      toast({ title: "Eksik Bilgi", description: "Banka adı, hesap sahibi ve IBAN zorunludur.", variant: "destructive" });
      return;
    }
    if (!isValidTrIban(bankForm.iban)) {
      toast({ title: "Geçersiz IBAN", description: "TR ile başlayan 26 haneli geçerli bir IBAN girin.", variant: "destructive" });
      return;
    }
    setSavingBank(true);
    try {
      await companyService.saveBankAccount(
        { ...bankForm, branch_id: bankForm.branch_id === ALL_BRANCHES ? null : bankForm.branch_id },
        editing?.id
      );
      toast({ title: editing ? "Hesap güncellendi" : "Hesap eklendi", description: bankForm.bank_name.trim() });
      setBankOpen(false);
      await load();
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Hesap kaydedilemedi.",
        variant: "destructive",
      });
    } finally {
      setSavingBank(false);
    }
  };

  const toggleActive = async (acc: BankAccount) => {
    try {
      await companyService.setBankAccountActive(acc.id, !acc.is_active);
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "İşlem yapılamadı.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await companyService.deleteBankAccount(toDelete.id);
      toast({ title: "Hesap silindi", description: toDelete.bank_name });
      setToDelete(null);
      await load();
    } catch (error) {
      toast({ title: "Silinemedi", description: error instanceof Error ? error.message : "Hesap silinemedi.", variant: "destructive" });
      setToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Şirket Bilgileri</CardTitle>
          <CardDescription>
            Bu bilgiler KVKK Aydınlatma Metni, Açık Rıza Metni ve Çerez Politikası sayfalarında otomatik görünür. Boş bırakılan alanlar
            metinlerde köşeli parantezle işaretli kalır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-name">Ticari Unvan</Label>
                <Input id="co-name" value={form.legal_name ?? ""} onChange={set("legal_name")} placeholder="Örn: ... Spor Eğitim Hizmetleri Ltd. Şti." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-taxoffice">Vergi Dairesi</Label>
                <Input id="co-taxoffice" value={form.tax_office ?? ""} onChange={set("tax_office")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-taxno">Vergi No / TCKN</Label>
                <Input id="co-taxno" value={form.tax_number ?? ""} onChange={set("tax_number")} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-mersis">MERSİS No</Label>
                <Input id="co-mersis" value={form.mersis_no ?? ""} onChange={set("mersis_no")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-verbis">VERBİS Sicil No (yükümlüyse)</Label>
                <Input id="co-verbis" value={form.verbis_number ?? ""} onChange={set("verbis_number")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-address">Adres</Label>
                <Textarea id="co-address" rows={2} value={form.address ?? ""} onChange={set("address")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-phone">Telefon</Label>
                <Input id="co-phone" value={form.phone ?? ""} onChange={set("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-email">E-posta</Label>
                <Input id="co-email" type="email" value={form.email ?? ""} onChange={set("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-kep">KEP Adresi</Label>
                <Input id="co-kep" value={form.kep_address ?? ""} onChange={set("kep_address")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="co-web">Web Sitesi</Label>
                <Input id="co-web" value={form.website ?? ""} onChange={set("website")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="co-kvkk">KVKK Başvuru E-postası</Label>
                <Input id="co-kvkk" type="email" value={form.kvkk_contact_email ?? ""} onChange={set("kvkk_contact_email")} placeholder="Velilerin KVKK taleplerini göndereceği adres" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Button type="submit" disabled={savingCompany} className="bg-emerald-600 hover:bg-emerald-700">
                {savingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Şirket Bilgilerini Kaydet
              </Button>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link href="/kvkk" target="_blank" className="inline-flex items-center gap-1 text-emerald-700 underline">
                  <FileText className="w-4 h-4" /> KVKK Aydınlatma Metni
                </Link>
                <Link href="/acik-riza" target="_blank" className="inline-flex items-center gap-1 text-emerald-700 underline">
                  <FileText className="w-4 h-4" /> Açık Rıza Metni
                </Link>
                <Link href="/cerez-politikasi" target="_blank" className="inline-flex items-center gap-1 text-emerald-700 underline">
                  <FileText className="w-4 h-4" /> Çerez Politikası
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Banka Hesapları (IBAN)</CardTitle>
            <CardDescription>
              Havale/EFT ile ödeme alınan hesaplar. Hesabı tüm şubeler için ya da yalnızca belirli bir şube için tanımlayabilirsiniz.
              Ödeme kaydederken (Havale/EFT) paranın yattığı hesap seçilir.
            </CardDescription>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openBank()}>
            <Plus className="w-4 h-4 mr-2" />
            Hesap Ekle
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-600">Henüz banka hesabı eklenmedi.</p>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className={`rounded-lg border p-4 ${acc.is_active ? "bg-white" : "bg-gray-50 opacity-70"}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium flex flex-wrap items-center gap-2">
                      <Landmark className="w-4 h-4 text-emerald-600" />
                      {acc.bank_name}
                      <Badge variant="outline">{acc.branch_id ? getBranchName(acc.branch_id) : "Tüm şubeler"}</Badge>
                      {!acc.is_active && <Badge variant="secondary">Pasif</Badge>}
                    </p>
                    <p className="text-sm text-gray-600 break-words">{acc.account_holder}</p>
                    <p className="font-mono text-sm break-all">{formatIban(acc.iban)}</p>
                    {(acc.bank_branch || acc.description) && (
                      <p className="text-xs text-gray-500 break-words">{[acc.bank_branch, acc.description].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openBank(acc)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Düzenle
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(acc)}>
                      <Power className="w-4 h-4 mr-2" />
                      {acc.is_active ? "Pasife Al" : "Aktifleştir"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setToDelete(acc)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={bankOpen} onOpenChange={(o) => !savingBank && setBankOpen(o)}>
        <DialogContent className="max-w-md">
          <form onSubmit={saveBank} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Hesabı Düzenle" : "Banka Hesabı Ekle"}</DialogTitle>
              <DialogDescription>IBAN doğrulanır; geçersiz IBAN kaydedilmez.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="bk-bank">Banka Adı *</Label>
              <Input id="bk-bank" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="Örn: Ziraat Bankası" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-holder">Hesap Sahibi *</Label>
              <Input id="bk-holder" value={bankForm.account_holder} onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-iban">IBAN *</Label>
              <Input
                id="bk-iban"
                value={bankForm.iban}
                onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value.toUpperCase() })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="font-mono"
              />
              {bankForm.iban.trim().length > 0 && !isValidTrIban(bankForm.iban) && (
                <p className="text-xs text-amber-700">IBAN henüz geçerli görünmüyor (TR + 24 rakam).</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-bankbranch">Banka Şubesi</Label>
              <Input id="bk-bankbranch" value={bankForm.bank_branch} onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Hangi şubeler için geçerli?</Label>
              <Select value={bankForm.branch_id} onValueChange={(v) => setBankForm({ ...bankForm, branch_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_BRANCHES}>Tüm şubeler</SelectItem>
                  {branches.filter((b) => b.is_active || b.id === bankForm.branch_id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-desc">Açıklama</Label>
              <Input id="bk-desc" value={bankForm.description} onChange={(e) => setBankForm({ ...bankForm, description: e.target.value })} placeholder="Örn: Aidat hesabı" />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setBankOpen(false)} disabled={savingBank}>İptal</Button>
              <Button type="submit" disabled={savingBank} className="bg-emerald-600 hover:bg-emerald-700">
                {savingBank && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.bank_name} ({toDelete ? formatIban(toDelete.iban) : ""}) hesabını silmek istediğinizden emin misiniz? Bu hesaba
              bağlanmış geçmiş ödeme kayıtları silinmez; yalnızca hesap bağlantısı kalkar. Silmek yerine pasife almayı da düşünebilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

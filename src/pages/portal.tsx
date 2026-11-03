import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { RoleGate } from "@/components/RoleGate";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChildSection } from "@/components/portal/ChildSection";
import { parentService, type MyChild } from "@/services/parentService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function PortalInner() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);
  const [children, setChildren] = useState<MyChild[]>([]);
  const [loading, setLoading] = useState(true);

  const [kvkkTick, setKvkkTick] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const [code, setCode] = useState("");
  const [link, setLink] = useState({ studentName: "", studentBirthDate: "", parentPhone: "" });
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUserId(id);
      if (!id) return;
      const ok = await parentService.hasCurrentKvkkConsent(id);
      setConsented(ok);
      if (ok) setChildren(await parentService.getMyChildren());
    } catch (error) {
      console.error(error);
      toast({ title: "Hata", description: "Bilgiler yüklenemedi.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // KVKK metni güncellendiyse yeni sürüm onaylanmadan portal açılmaz
  const acceptKvkk = async () => {
    if (!userId || !kvkkTick) return;
    setAccepting(true);
    try {
      await parentService.acceptCurrentKvkk(userId);
      setLoading(true);
      await load();
    } catch (error) {
      toast({ title: "Hata", description: error instanceof Error ? error.message : "Onay kaydedilemedi.", variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  const linkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.replace(/[^A-Za-z0-9]/g, "").length !== 8) {
      toast({ title: "Geçersiz kod", description: "Davet kodu 8 karakterdir (XXXX-XXXX).", variant: "destructive" });
      return;
    }
    if (link.studentName.trim().length < 2 || !link.studentBirthDate || link.parentPhone.replace(/\D/g, "").length < 10) {
      toast({ title: "Eksik bilgi", description: "Öğrenci adı, doğum tarihi ve anne/baba cep telefonu gerekli.", variant: "destructive" });
      return;
    }
    setLinking(true);
    try {
      const name = await parentService.linkStudent({ code, ...link });
      toast({ title: "Öğrenci eklendi", description: name ? `${name} hesabınıza bağlandı.` : "Öğrenci hesabınıza bağlandı." });
      setCode("");
      setLink({ studentName: "", studentBirthDate: "", parentPhone: "" });
      setChildren(await parentService.getMyChildren());
    } catch (error) {
      toast({ title: "Eklenemedi", description: error instanceof Error ? error.message : "Kod kabul edilmedi.", variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <SEO title="Veli Portalı - FootbalLab" />
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-4 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Veli Portalı</h1>
            <p className="mt-1 text-gray-600">Çocuğunuzla ilgili bilgiler bu sayfada toplanır.</p>
          </div>

          {loading ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              </CardContent>
            </Card>
          ) : consented === false ? (
            <Dialog open>
              <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 pr-6">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    KVKK Aydınlatma Metni
                  </DialogTitle>
                  <DialogDescription>
                    Devam etmek için güncel KVKK Aydınlatma Metni'ni okuyup onaylamanız gerekir.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-start gap-3 rounded-md border-2 border-emerald-200 bg-emerald-50 p-3">
                  <Checkbox id="portal-kvkk" checked={kvkkTick} onCheckedChange={(v) => setKvkkTick(v === true)} className="mt-1" />
                  <Label htmlFor="portal-kvkk" className="cursor-pointer text-sm leading-relaxed">
                    <Link href="/kvkk" target="_blank" className="font-medium text-emerald-700 underline">
                      KVKK Aydınlatma Metni
                    </Link>
                    'ni okudum ve anladım.
                  </Label>
                </div>
                <DialogFooter>
                  <Button onClick={acceptKvkk} disabled={!kvkkTick || accepting} className="bg-emerald-600 hover:bg-emerald-700">
                    {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Onayla ve Devam Et
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="space-y-6">
              {children.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-600">Hesabınıza bağlı öğrenci bulunmuyor. Aşağıdan davet kodu ekleyebilirsiniz.</CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {userId && children.map((c) => <ChildSection key={c.student_id} child={c} userId={userId} />)}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Başka bir çocuk ekle</CardTitle>
                  <CardDescription>Okuldan aldığınız yeni davet kodunu girerek diğer çocuğunuzu da hesabınıza bağlayın.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={linkStudent} className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 9))}
                      placeholder="Davet kodu (XXXX-XXXX)"
                      className="font-mono tracking-widest"
                      autoComplete="off"
                    />
                    <Input
                      value={link.studentName}
                      onChange={(e) => setLink({ ...link, studentName: e.target.value })}
                      placeholder="Öğrencinin adı soyadı"
                      autoComplete="off"
                    />
                    <Input
                      type="date"
                      aria-label="Öğrencinin doğum tarihi"
                      value={link.studentBirthDate}
                      onChange={(e) => setLink({ ...link, studentBirthDate: e.target.value })}
                    />
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={link.parentPhone}
                      onChange={(e) => setLink({ ...link, parentPhone: e.target.value })}
                      placeholder="Anne/baba cep telefonu"
                      autoComplete="tel"
                    />
                    <Button type="submit" disabled={linking} className="sm:col-span-2 sm:w-fit">
                      {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Ekle
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PortalPage() {
  return (
    <RoleGate level="parent">
      <PortalInner />
    </RoleGate>
  );
}

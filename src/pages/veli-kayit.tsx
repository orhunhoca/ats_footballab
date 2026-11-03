import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Loader2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parentService, type OptionalConsents } from "@/services/parentService";
import { authService } from "@/services/authService";

const OPTIONAL_ITEMS: { key: keyof OptionalConsents; label: string }[] = [
  { key: "health", label: "Öğrencinin sağlık raporu bilgisinin, antrenmanlara güvenli katılım amacıyla işlenmesine onay veriyorum." },
  { key: "media_internal", label: "Öğrencinin antrenman/maç fotoğraf ve videolarının Okul içinde saklanmasına ve velilere paylaşılmasına onay veriyorum." },
  { key: "media_social", label: "Bu görüntülerin Okul'un sosyal medya hesaplarında ve tanıtım materyallerinde yayımlanmasına onay veriyorum." },
  { key: "whatsapp", label: "Yoklama, ödeme ve rapor bilgilendirmelerinin WhatsApp ile gönderilmesine onay veriyorum." },
  { key: "commercial", label: "Kampanya ve etkinlik içerikli ticari elektronik iletilerin gönderilmesine onay veriyorum." },
  { key: "abroad", label: "Verilerimin, bulut ve mesajlaşma hizmetleri nedeniyle yurt dışındaki hizmet sağlayıcılara aktarılmasına onay veriyorum." },
];

/** Davet kodu ile veli kaydı. KVKK Aydınlatma Metni onaylanmadan kayıt tamamlanamaz (sunucuda da zorunlu). */
export default function ParentRegisterPage() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean | null>(null);
  const [form, setForm] = useState({ code: "", fullName: "", relation: "Anne", email: "", password: "", password2: "" });
  const [kvkk, setKvkk] = useState(false);
  const [consents, setConsents] = useState<OptionalConsents>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    parentService.isRegistrationOpen().then(setOpen);
  }, []);

  // ?kod=XXXX-XXXX bağlantısıyla gelirse kodu doldur
  useEffect(() => {
    const code = router.query.kod;
    if (typeof code === "string") setForm((f) => ({ ...f, code: code.toUpperCase().slice(0, 9) }));
  }, [router.query.kod]);

  const passwordsMatch = form.password === form.password2;
  const canSubmit =
    kvkk &&
    !loading &&
    form.code.replace(/[^A-Za-z0-9]/g, "").length === 8 &&
    form.fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8 &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!kvkk) {
      setError("KVKK Aydınlatma Metni'ni onaylamadan kayıt olunamaz.");
      return;
    }
    if (!passwordsMatch) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      // Reddedilen maddeler de "false" olarak kaydedilir (tercih kanıtı)
      const full: OptionalConsents = {};
      for (const item of OPTIONAL_ITEMS) full[item.key] = consents[item.key] === true;

      await parentService.register({
        code: form.code,
        fullName: form.fullName,
        relation: form.relation,
        email: form.email,
        password: form.password,
        kvkkAccepted: kvkk,
        consents: full,
      });
      await authService.signIn(form.email.trim().toLowerCase(), form.password);
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Veli Kaydı - FootbalLab</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex justify-center">
            <Brand size={56} showName={false} />
          </div>
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Veli Kaydı</CardTitle>
              <CardDescription>Okuldan aldığınız davet koduyla hesabınızı oluşturun.</CardDescription>
            </CardHeader>
            <CardContent>
              {open === null ? (
                <div className="py-8 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : !open ? (
                <Alert>
                  <AlertDescription>Veli kaydı şu anda kapalıdır. Lütfen okulla iletişime geçin.</AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Davet Kodu *</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 9) })}
                      placeholder="XXXX-XXXX"
                      className="font-mono tracking-widest"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ad Soyad *</Label>
                    <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Öğrenciye Yakınlığınız</Label>
                    <Select value={form.relation} onValueChange={(v) => setForm({ ...form, relation: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Anne">Anne</SelectItem>
                        <SelectItem value="Baba">Baba</SelectItem>
                        <SelectItem value="Vasi">Vasi / Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta *</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Şifre * (en az 8)</Label>
                      <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password2">Şifre Tekrar *</Label>
                      <Input id="password2" type="password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} autoComplete="new-password" />
                    </div>
                  </div>
                  {form.password2.length > 0 && !passwordsMatch && <p className="text-xs text-red-600">Şifreler eşleşmiyor.</p>}

                  <div className="rounded-md border-2 border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox id="kvkk" checked={kvkk} onCheckedChange={(v) => setKvkk(v === true)} className="mt-1" />
                      <Label htmlFor="kvkk" className="cursor-pointer text-sm leading-relaxed">
                        <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-700" />
                        <Link href="/kvkk" target="_blank" className="font-medium text-emerald-700 underline">
                          KVKK Aydınlatma Metni
                        </Link>
                        'ni okudum ve anladım. <span className="font-semibold">(Zorunlu — onaylamadan kayıt olunamaz)</span>
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">
                      İsteğe bağlı açık rıza tercihleri{" "}
                      <Link href="/acik-riza" target="_blank" className="text-xs font-normal text-emerald-700 underline">
                        (metni oku)
                      </Link>
                    </p>
                    <p className="text-xs text-gray-600">Onay vermemeniz kaydınızı engellemez; ilgili özellik (örn. fotoğraf paylaşımı) kapalı kalır. Tercihlerinizi sonradan değiştirebilirsiniz.</p>
                    {OPTIONAL_ITEMS.map((item) => (
                      <div key={item.key} className="flex items-start gap-3">
                        <Checkbox
                          id={`c-${item.key}`}
                          checked={consents[item.key] === true}
                          onCheckedChange={(v) => setConsents({ ...consents, [item.key]: v === true })}
                          className="mt-0.5"
                        />
                        <Label htmlFor={`c-${item.key}`} className="cursor-pointer text-xs font-normal leading-relaxed">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!canSubmit}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kayıt yapılıyor...
                      </>
                    ) : (
                      "Kaydı Tamamla"
                    )}
                  </Button>
                  {!kvkk && <p className="text-center text-xs text-gray-600">Devam etmek için KVKK Aydınlatma Metni'ni onaylayın.</p>}
                  <p className="text-center text-sm text-gray-600">
                    Zaten hesabınız var mı?{" "}
                    <Link href="/login" className="text-emerald-700 underline">
                      Giriş yapın
                    </Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

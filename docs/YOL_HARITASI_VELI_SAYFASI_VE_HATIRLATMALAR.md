# Yol Haritası — Şirket/Banka, Veli Sayfası, Otomatik Hatırlatmalar

## 0. Yapıldı (bu aşama)
- Şirket bilgileri + banka hesapları (IBAN, tüm şubeler veya şubeye özel) — Ayarlar → Şirket ve Banka (yalnız admin düzenler; yönetim okur)
- Havale/EFT ödemesinde paranın yattığı hesap seçimi (`payment_history.bank_account_id`)
- KVKK Aydınlatma, Açık Rıza, Çerez Politikası sayfaları (şirket bilgisi otomatik) + alt bilgide "© ATS - All Time Sports"

## 1. Veli erişim sayfası (`/portal`) — DURUM: kayıt ve KVKK onayı YAPILDI (davet kodu); veri ekranları sırada
**Yapıldı**: davet kodu ile kayıt, sunucuda zorunlu KVKK onayı, onay kayıtları, veli ↔ çocuk bağlantısı, yönetim ekranı (kod üret/iptal, bağlı veliler), açma/kapama anahtarı, portal iskeleti (çocuk kartları, ikinci çocuk ekleme, sürüm değişince yeniden onay).
**Sırada**: yoklama, performans raporları, galeri, bakiye/ödeme (aşağıdaki tasarım).

### Tasarım (ayrıntı)
**Rol ve bağlantı**: `profiles.role = 'parent'`; `parent_students(parent_user_id, student_id, relation)` ile veli ↔ çocuk(lar).
Veli yalnızca kendi çocuklarının verisini görür (RLS ile veritabanında zorunlu; `requireStaff` varsayılanı parent'ı zaten dışarıda bırakır).
**Kayıtta zorunlu KVKK onayı (KURAL — kullanıcı kararı)**: Veli, KVKK Aydınlatma Metni'ni onaylamadan kayıt olamaz/devam edemez.
Yalnızca arayüzdeki onay kutusuna güvenilmez; **sunucu tarafında zorunlu** kılınır:
- Supabase'in herkese açık kaydı kapalı kalır; veli hesabı yalnızca kayıt Edge Function'ı (`parent-register`) ile oluşur. Fonksiyon, `kvkk_accepted !== true` ise hesabı hiç oluşturmaz (400).
- Onay `consents` tablosuna kalıcı yazılır: kullanıcı, belge türü, **belge sürümü**, onay/ret, tarih-saat, IP, tarayıcı, kaynak. Yönetim denetim için okur.
- Metin sürümü (`LEGAL_VERSION`) değişirse veli bir sonraki girişte yeni sürümü onaylamadan portala giremez.
- Açık Rıza maddeleri (sağlık, medya, WhatsApp, ticari ileti, yurt dışı) ayrı ayrı ve isteğe bağlıdır; reddedilirse ilgili özellik (örn. galeri) kapalı kalır.
**Hesap yönetimi (admin + yönetici)**: öğrenci kartından "Veli Hesabı Aç" (e-posta + geçici şifre; çoklu çocuk bağlama), pasife alma, şifre sıfırlama, "Veliler" listesi.
**Veli ekranları**: Yoklama (çocuk bazlı), Performans testleri ve raporlar (PDF), Galeri (yalnız medya rızası olan ve çocuğun grubu/kendisi için yüklenenler), Bakiye ve ödemeler.
**İlk giriş**: KVKK Aydınlatma okuma + Açık Rıza maddeleri (sağlık, medya, WhatsApp, yurt dışı) → `consents` tablosuna tarih damgalı kayıt; medya rızası yoksa galeri kapalı.
**Bakiye**: Şu an ödeme planı öğrenci satırındaki tek tutardan ibaret. Doğru bakiye için `student_charges` (borç kalemleri: aidat/taksit/kıyafet, vade tarihi, tutar) kurulmalı;
bakiye = Σ borç − Σ ödeme. Aynı tablo otomatik aidat hatırlatmalarını ve mali raporları da doğru besler.
**Ödeme**: (a) Kredi kartı — iyzico (önce callback'in sunucu tarafında service-role ile çalışması ve IYZWSv2 imzası düzeltilmeli, `SUPABASE_SERVICE_ROLE_KEY` Vercel env);
(b) Havale/EFT — veli banka hesaplarını görür, "Ödeme Bildirimi" gönderir (tutar, tarih, dekont, not) → yönetici onaylayınca `payment_history` kaydı oluşur, bakiye düşer.
**Galeri altyapısı**: `student-photos` storage bucket'ı şu an **yok** (galeri yükleme çalışmaz). Özel (private) bucket + imzalı URL + yönetim yazar / veli kendi çocuğunu okur politikası kurulmalı.

## 2. Otomatik hatırlatmalar — GERÇEK DURUM
Şu an **otomatik çalışan hatırlatma yok**. Kodda zamanlama yardımcıları (`scheduledMessageService`) ve ayar ekranı var,
ama onları her gün çalıştıran bir zamanlayıcı kurulu değil, doğum günü için `birthday_greeting` şablonu da yok.
**Kurulacak sistem**: günlük çalışan Edge Function (`daily-reminders`) + zamanlayıcı (Supabase pg_cron + pg_net veya Vercel Cron), `CRON_SECRET` ile korumalı.
Kurallar: aidat (vadeden N gün önce + gecikme), kayıt bitişi (30/15/7 gün), doğum günü (aynı gün); `whatsapp_messages` ile mükerrer gönderim engeli; şube bazlı açma/kapama.
**Ön koşullar**: WhatsApp bağlı, ilgili Meta şablonları onaylı (`payment_reminder` var; yeni: `registration_expiry`, `birthday_greeting`), pg_cron etkin, `CRON_SECRET` tanımlı.

## 3. Önerilen sıra
1. Hukuk incelemesi + şirket/banka bilgilerinin girilmesi (hazır)
2. `student_charges` (borç kalemleri) + mali raporların gerçek tahsilattan hesaplanması
3. WhatsApp bağlantısı + şablon onayları → otomatik hatırlatmalar
4. iyzico düzeltmesi
5. Veli erişim sayfası (rıza + yoklama/performans/bakiye → galeri → ödeme)

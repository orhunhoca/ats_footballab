# WhatsApp ve Yapay Zeka Kurulum Rehberi (FootbalLab)

Gizli anahtarları (token, API anahtarı) bu dosyaya, commit'e veya sohbete **yazmayın**.

## A. Yapay zeka analizi (opsiyonel; anahtar yoksa kural tabanlı analiz çalışır)
1. https://console.anthropic.com adresinde hesap açın, **Billing**'den kredi yükleyin.
2. **API Keys → Create Key** ile anahtar oluşturup kopyalayın (yalnızca bir kez gösterilir).
3. Supabase Dashboard → proje **alltimesports** → soldan **Edge Functions** → **Secrets** → **Add new secret**.
   Name: `ANTHROPIC_API_KEY`, Value: kopyaladığınız anahtar → **Save**.
4. Performans sayfasında bir öğrenci seçip **AI Analizi**'ne basın; başlıkta "AI Destekli Gelişim Analizi" yazıyorsa çalışıyordur.

## B. WhatsApp bağlantısı (Meta WhatsApp Business Platform)
1. https://business.facebook.com → bir Meta Business hesabı (yoksa oluşturun, işletme doğrulaması gerekebilir).
2. https://developers.facebook.com → **My Apps → Create App** → tür **Business** → uygulamaya **WhatsApp** ürününü ekleyin.
3. WhatsApp → **API Setup**: okul numarasını ekleyip doğrulayın. (Numara daha önce normal WhatsApp'ta kullanılıyorsa önce o hesaptan silinmelidir.)
4. Aşağıdakileri not alın:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
   - **Kalıcı Access Token**: Business Settings → Users → **System Users** → yeni kullanıcı (Admin) → uygulamaya erişim ver → **Generate token** → izinler `whatsapp_business_messaging` ve `whatsapp_business_management`, süre **Never**.
5. Uygulamada **Ayarlar → WhatsApp**: Phone Number ID, Access Token, Business Account ID alanlarını doldurup entegrasyonu açın → **Test Telefon Numarası** ile test edin.

## C. Şablonları Meta'da oluşturma (WhatsApp Manager → Message templates → Create)
Hepsi: Kategori **Utility**, Dil **Turkish (tr)**. Ad ve gövde aşağıdakiyle **aynı** olmalı
(`whatsapp_templates` tablosundaki `message_content` ile aynıdır). Örnek değerleri Meta ister; aşağıdakileri girebilirsiniz.

**1) `performance_report`**
```
Merhaba {{1}} 👋

{{2}} için {{3}} tarihli performans test sonuçları hazır:

📊 {{4}}

💬 Antrenör değerlendirmesi: {{5}}

Gelişimi birlikte takip etmeye devam ediyoruz.
FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 02.11.2026 · 20m Sprint: 3,42 sn (%5 gelişim); Dikey Sıçrama: 32 cm. · Hız alanında gelişim görülüyor.

**2) `payment_reminder`**
```
Merhaba {{1}} 👋

{{2}} için {{3}} tarihinde ödenecek {{4}} TL tutarındaki ödemeniz bulunmaktadır.

Sorularınız için bize WhatsApp üzerinden yazabilirsiniz.

FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 15.11.2026 · 2.500

**3) `attendance_notification`**
```
Merhaba {{1}} 👋

{{2}} bugünkü antrenmanımıza {{3}}.

İyi günler dileriz.
FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · katıldı

**4) `general_announcement`**
```
Merhaba, sayın velimiz 👋

{{1}}

Sevgilerimizle,
FootbalLab Futbol Okulu
```
Örnek: Bu cumartesi antrenman saat 10:00'a alınmıştır.

**5) `performance_report_pdf`** (PDF'li performans raporu — Performans sayfası → *Veliye Gönder* → "Raporu PDF olarak gönder")

Bu şablonda **Header (Başlık) = Document** seçilir; Meta örnek bir PDF ister (uygulamadan "PDF İndir" ile aldığınız herhangi bir rapor olur). Kategori: Utility, dil: Turkish (tr).
```
Merhaba {{1}} 👋

{{2}} için {{3}} tarihli performans raporu ekte PDF olarak paylaşılmıştır.

💬 Antrenör değerlendirmesi: {{4}}

Gelişimi birlikte takip etmeye devam ediyoruz.
FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 03.11.2026 · Hız ve kuvvet alanında gelişim görülüyor.

PDF, uygulamada üretilir, özel `reports` deposuna yüklenir ve Meta'ya 24 saat geçerli imzalı bağlantıyla verilir.

Onaylanan şablonların durumunu veritabanında `approved` yapmak şart değildir; gönderimi Meta doğrular.

## C2. Otomatik mesaj şablonları (zamanlayıcı kurulduğunda gerekir)
Ayarlar → Otomatik Mesajlar'daki dört mesaj için Meta'da şablon oluşturun. Ad, dil **Turkish (tr)** ve gövde aşağıdakiyle aynı olmalı.
Değişkenler Meta'da sıra numarasıyla ({{1}}, {{2}}…) yazılır; panelde düzenlediğiniz metindeki `{veli_adi}`, `{ogrenci_adi}` vb. aynı sırayla eşleşir.
Panelde metni değiştirirseniz Meta'daki şablonu da aynı metinle yeniden onaylatın.

**5) `training_reminder`** (Kategori: Utility)
```
Merhaba {{1}} 👋

{{2}} için bugün saat {{3}} antrenmanımız var. Görüşmek üzere!

FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 17:00

**6) `birthday_greeting`** (Kategori: Marketing — Meta kutlama mesajlarını genelde Marketing sayar)
```
Merhaba {{1}} 🎂

{{2}}'in doğum gününü kutlar, nice mutlu ve sağlıklı yıllar dileriz!

FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali

**7) `anniversary_greeting`** (Kategori: Marketing)
```
Merhaba {{1}} ⚽

{{2}} ile birlikte {{3}}. yılımızı tamamladık. Bize güvendiğiniz için teşekkür ederiz!

FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 2

**8) `registration_expiry`** (Kategori: Utility; kayıt bitişi hatırlatması için)
```
Merhaba {{1}} 👋

{{2}} için kayıt süresi {{3}} tarihinde sona erecektir. Yenileme için bize WhatsApp üzerinden yazabilirsiniz.

FootbalLab Futbol Okulu
```
Örnekler: Ayşe Hanım · Ali · 15.12.2026

Not: Marketing kategorisindeki mesajlar velinin ticari ileti onayına (`acik_riza_ticari_ileti`) tabi olmalıdır; zamanlayıcı kurulurken
doğum günü/yıl dönümü gönderimi yalnızca bu onayı veren velilere yapılacaktır.

## D. Veliye gönderim
Performans → öğrenci seç → **Veliye Gönder**. Alıcılar öğrencinin `mother_phone` / `father_phone` alanlarından gelir.
Serbest metin/doküman/görsel mesajlar yalnızca velinin son mesajından sonraki 24 saat içinde teslim edilir; diğer her şey için onaylı şablon gerekir.

## E. Opsiyonel: Webhook (gelen mesaj, teslim/okundu durumu, bot)
Supabase secret'ları: `WHATSAPP_APP_SECRET` (zorunlu), `WHATSAPP_VERIFY_TOKEN`; zamanlayıcı için `CRON_SECRET`.
Meta → WhatsApp → Configuration → Webhook URL: `https://mhkvdpqwnuzvbuezrwgf.supabase.co/functions/v1/whatsapp-webhook`.

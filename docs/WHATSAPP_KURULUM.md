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

Onaylanan şablonların durumunu veritabanında `approved` yapmak şart değildir; gönderimi Meta doğrular.

## D. Veliye gönderim
Performans → öğrenci seç → **Veliye Gönder**. Alıcılar öğrencinin `mother_phone` / `father_phone` alanlarından gelir.
Serbest metin/doküman/görsel mesajlar yalnızca velinin son mesajından sonraki 24 saat içinde teslim edilir; diğer her şey için onaylı şablon gerekir.

## E. Opsiyonel: Webhook (gelen mesaj, teslim/okundu durumu, bot)
Supabase secret'ları: `WHATSAPP_APP_SECRET` (zorunlu), `WHATSAPP_VERIFY_TOKEN`; zamanlayıcı için `CRON_SECRET`.
Meta → WhatsApp → Configuration → Webhook URL: `https://mhkvdpqwnuzvbuezrwgf.supabase.co/functions/v1/whatsapp-webhook`.

# iyzico Online Ödeme Kurulumu (FootbalLab)

Akış: Yönetici → Ödemeler → öğrenci için **Online Ödeme Linki** oluşturur → veli linkten kartıyla öder →
iyzico veliyi sunucudaki `iyzico-callback` fonksiyonuna geri yönlendirir → sunucu sonucu iyzico'dan **kendisi doğrular**
→ ödeme **tek sefer** `payment_history`'ye "Online Ödeme" olarak yazılır ve öğrencinin bakiyesinden düşer.

## A. Test (sandbox) ortamı — önce bununla başlayın
1. https://sandbox-merchant.iyzipay.com adresinde ücretsiz **test üye işyeri** hesabı açın (canlı hesaptan bağımsızdır, anında açılır).
2. Panelde **Ayarlar → Firma Ayarları** (veya "API Anahtarları") bölümünden **API Key** ve **Secret Key**'i alın.
3. Uygulamada **Ayarlar → Ödeme** sekmesi:
   - iyzico Entegrasyonu anahtarını açın
   - API Key ve Secret Key'i yapıştırın
   - Base URL: `https://sandbox-api.iyzipay.com`
   - **Kaydet ve Bağlantıyı Test Et** düğmesine basın → "iyzico bağlantısı çalışıyor (test ortamı)" mesajı gelmeli.
4. **Ödemeler** sayfasından bir öğrenci için online ödeme linki oluşturun, linki açın.
5. iyzico test kartı: `5528 7900 0000 0008`, son kullanma: gelecekte herhangi bir tarih, CVC `123`
   (3D Secure şifresi sorulursa test ortamında `283126`). Güncel test kartları için: https://docs.iyzico.com
6. Ödeme bitince uygulamaya "Ödeme Başarılı" mesajıyla dönülür; ödeme **Ödemeler** listesinde "Online Ödeme" olarak görünür.

## B. Canlıya geçiş
1. Gerçek iyzico üye işyeri başvurusu (şirket belgeleri gerekir) onaylanınca canlı API Key / Secret Key alınır.
2. **Ayarlar → Ödeme**: yeni anahtarları girin, Base URL: `https://api.iyzipay.com`, tekrar **Kaydet ve Bağlantıyı Test Et**.
3. Küçük bir gerçek ödeme deneyin (örn. 10 ₺) ve iyzico panelinde göründüğünü doğrulayın.

## Bilinen noktalar
- Ödeme sayfasında istenen alıcı bilgilerinden e-posta ve TC kimlik no gerçek değil, sabit değerdir (iyzico zorunlu alan sayıyor; velilerden bu bilgi alınmıyor). İyzico canlıda bu konuda sizden ek bilgi isterse söyleyin.
- Ödeme sonrası veliye otomatik WhatsApp makbuzu gitmez (WhatsApp bağlantısı ve şablon onayı sonrası eklenecek).
- Sunucu, iyzico'nun bildirdiği tutarı kendi kaydıyla karşılaştırır; uyuşmazlık olursa ödeme **işlenmez**, kayıtta hata notu düşer ve veli okulla iletişime geçmesi için uyarılır. Bu durumda iyzico panelini kontrol edin.
- Ödeme alındı ama kayıt yazılamazsa kayıt "beklemede" kalır ve nedeni `online_payments.error_message`'a yazılır.

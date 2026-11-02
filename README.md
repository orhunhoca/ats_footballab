# ATS FootballLab (Sportex)

Futbol okulu yönetim paneli — Next.js + Supabase.

## Güvenlik kurulumu (zorunlu)

`supabase/migrations/20261102120000_security_hardening.sql` ile:

- Yeni kayıtlar her zaman `pending` rolüyle başlar ve hiçbir veriye erişemez.
  Roller: `admin` (tam yetki), `user` (personel/antrenör), `pending` (onay bekliyor).
- Tüm tablolarda anonim erişim kapalıdır; personel operasyonel verilere,
  yalnızca admin ayar tablolarına yazabilir.
- iyzico / WhatsApp sırları istemciden **okunamaz**, yalnızca yazılabilir.

### Deploy adımları

1. Migration'ı uygulayın: `supabase db push`
2. Edge function'ları deploy edin:
   ```bash
   supabase functions deploy admin-create-user
   supabase functions deploy send-whatsapp
   supabase functions deploy create-iyzico-payment
   supabase functions deploy process-scheduled-messages
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   ```
3. Edge function secret'larını tanımlayın:
   ```bash
   supabase secrets set WHATSAPP_APP_SECRET=... CRON_SECRET=...
   ```
   - `WHATSAPP_APP_SECRET` (zorunlu): Meta uygulama sırrı. Tanımlı değilse webhook tüm istekleri reddeder.
   - `CRON_SECRET`: `process-scheduled-messages` zamanlayıcıdan çağrılıyorsa `x-cron-secret` başlığında gönderilmeli.
   - İsteğe bağlı (veritabanındaki değerlerin yerine geçer): `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`,
     `IYZICO_BASE_URL`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `ALLOWED_ORIGIN`.
4. Supabase panelinde **Authentication → Sign In / Providers → "Allow new users to sign up"** seçeneğini kapatın.
   Antrenör hesapları artık `admin-create-user` fonksiyonu üzerinden açılır.
5. `admin@sportex.com` hesabının şifresini değiştirin ve `profiles` tablosundaki `admin`/`user`
   rollerini gözden geçirin (tanımadığınız hesapları `pending` yapın).

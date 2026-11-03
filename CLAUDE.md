# CLAUDE.md — ATS FootbalLab (FootbalLab Futbol Okulu)

Bu dosya yeni oturumlarda otomatik okunur. Projenin güncel durumunu, altyapısını, alınmış kararları ve açık işleri özetler. Son güncelleme: 2026-11-02. Marka adı artık **FootbalLab** (eski adı Sportex); logo `public/logo.png`, kod `src/components/Brand.tsx`.

## Kullanıcı ve çalışma şekli
- Proje sahibi: Orhun Güngördü (`orhunhoca@gmail.com`). **Yazılımcı değil.** Türkçe konuş, kendi yapması gereken adımları numaralı ve sade yaz, menü yollarını tam ver.
- Yapabildiğin her şeyi kendin yap (Supabase / Vercel / GitHub araçları bağlı); yalnızca panelden yapılabilenleri ona bırak.
- Akış: `claude/...` branch → PR → kullanıcı istediğinde `main`'e merge → Vercel `main`'den otomatik production deploy. Bu oturumda PR'ları kullanıcının talimatıyla merge ettik (PR #1–#4).
- Geliştirme artık yalnızca buradan; **Softgen bağlantısı kesildi**. Softgen'e özgü kod ekleme.
- Gizli bilgileri (şifre, anahtar) dosyaya / commit'e / PR'a yazma.

## Ürün
Futbol okulu yönetim paneli: öğrenciler, gruplar, antrenörler, deneme öğrencileri, yoklama, antrenman, performans testleri, ödemeler (iyzico), WhatsApp bildirim/bot, zamanlanmış mesajlar, galeri, PDF/Excel rapor, dashboard. Arayüz Türkçe.

## Şubeler (çok şubeli okul)
- `branches` tablosu (ad, adres, telefon, `is_active`): personel okur, yalnız admin yazar. Varsayılan şube "Merkez Şube"; mevcut tüm kayıtlar ona bağlandı.
- `branch_id` kolonları: `students`, `coaches`, `groups`, `trial_students`, `payment_history` (nullable; formlar şube seçtirir, `on delete restrict` → kaydı olan şube silinemez, pasife alınır). `payment_history.branch_id` ekleme anında öğrencinin şubesinden trigger ile atanır (`set_payment_branch`).
- Arayüz: `/branches` (admin) şube yönetimi; üst menüde `BranchSwitcher` (2+ aktif şube varsa) → `BranchContext` (`useBranch`, seçim localStorage'da, `null` = Tüm Şubeler). Liste servisleri `branchId` parametresi alır (öğrenci, grup, antrenör, deneme öğrencisi, ödeme, mali rapor); Raporlar'da "Tüm Şubeler" seçiliyken şube bazında ciro tablosu çıkar.
- Formlarda şube zorunlu (`BranchSelect`); öğrenci formunda grup, antrenör ve grup formunda antrenör seçimi seçilen şubeye göre filtrelenir. `admin-create-user` antrenör kaydına `branch_id` yazar.
- Yetki: yönetim tüm şubeleri görür; antrenör yalnız kendi şubesini (bkz. Güvenlik modeli). Şube seçici (`BranchSwitcher`) yalnız yönetime görünür.

## Teknoloji
- Next.js 15 (Pages Router) + React 18 + TypeScript + Tailwind + shadcn/ui.
- Supabase: Postgres + Auth + Edge Functions (Deno). İstemci `src/integrations/supabase/client.ts` (anon key, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; örnek `.env.example`).
- İş mantığı `src/services/*Service.ts`, sayfalar `src/pages`, tipler `src/integrations/supabase/database.types.ts` (elle güncelleniyor; şema değişince ilgili tipi de düzelt).

## Altyapı (kimlikler gizli değildir)
| Ne | Değer |
|---|---|
| GitHub | `orhunhoca/ats_footballab`, varsayılan branch `main` |
| Supabase projesi | ref `mhkvdpqwnuzvbuezrwgf`, ad hâlâ `sg-71000098`, bölge `eu-central-1`, org `sportex` (**free plan**) |
| Vercel | takım `team_wd6RTtl7gnt3Xhe3wPYR441k` (`orhunhoca-9412s-projects`), proje `alltimesports` (`prj_kLw8TEMVPDfnWnB8lAlyfETB3TMO`) |
| Canlı adres | https://alltimesports.vercel.app (fonksiyon bölgesi `fra1`, `vercel.json`) |

- Vercel Hobby: build'ler sıraya girer (önce branch preview, sonra production); bir deploy ~2–3 dk.
- Bu sandbox'tan supabase.co ve vercel.app'e doğrudan HTTP **kapalı**. Doğrulama için: Supabase `execute_sql` / `query_logs` / `get_advisors`, Vercel `get_deployment` / `list_deployment_events` / `web_fetch_vercel_url`.
- Vercel takım erişimi bir kez `authorize_team_access` ile onaylatıldı; 403 alırsan yeniden link üret.
- Eski Softgen Vercel projesi (`sg-71000098-…`) silindi.

## Güvenlik modeli (roller 2026-11-03'te yenilendi, canlıda)
- **Roller** (`profiles.role`, kontrol `profiles_role_check`): `admin` (her şeyi girer/yönetir: şube, antrenör, şablon, ayar; yönetici atar), `manager` = **yönetici** (tüm şubelerin öğrenci, yoklama, ödeme, rapor verisine ulaşır ve operasyonel kayıt girer; şube/antrenör/şablon/ayar yönetemez, rol atayamaz), `user` = **antrenör** (yalnız kendi şubesinin öğrenci bilgisi [salt okunur], yoklama, performans testleri ve raporlar), `pending` (hiçbir şey). Arayüzde `useUserRole()` → `admin | manager | coach`; `isManagement` = admin + yönetici.
- `handle_new_user` trigger'ı her yeni kullanıcıyı `pending` yapar. `prevent_role_escalation` trigger'ı admin olmayanın rol değiştirmesini engeller (service_role / SQL editörü serbest). Yönetici atama: admin → `/users` (listeden yetki seçer ya da "Yönetici Ekle"); hesap `admin-create-user` ile `role: "manager"` açılır. Admin rolü arayüzden verilmez.
- Yardımcılar (SECURITY DEFINER): `is_admin()`, `is_management()` (admin+yönetici), `is_staff()` (admin+yönetici+antrenör), `current_coach_branch_id()` (antrenörün `coaches.user_id` kaydındaki şube), `can_access_branch(b)` (yönetim her şube; antrenör yalnız kendi şubesi). Linter uyarısı beklenen durum.
- **RLS** (anon'a politika yok): yalnız yönetim → `payment_history`, `online_payments`, `scheduled_messages`, `whatsapp_messages/media/chatbot_logs`, `notifications`, `trial_students`. Yönetim okur + admin yazar → `settings`, `payment_plans`, `document_templates`, `whatsapp_templates`, `message_scheduler_settings`, `iyzico_settings`, `whatsapp_settings`. Personel okur + admin yazar → `branches`, `test_protocols`. Personel okur + yönetim yazar → `training_*`, `group_training_assignments`. Şubeye göre: `students`, `groups`, `student_groups`, `group_schedule`, `coaches` (antrenör kendi şubesini okur; yönetim hepsini; yazma: students/groups yönetim, coaches admin); `attendance` ve `performance_tests` antrenör kendi şubesinde okur+yazar. `schools`: personel okur, yönetim ekler, admin düzenler. `users` yalnız admin; `profiles` kendi satırı / admin.
- **Bilinen sınırlama**: `students` satırındaki ödeme kolonları (`payment_amount`, `payment_plan`, `payment_status`…) antrenörün API ile okuyabildiği satırın parçasıdır; arayüz bunları antrenöre göstermez ama veritabanı seviyesinde gizli değildir (ayırmak için ödeme alanlarını ayrı tabloya taşımak gerekir).
- **Sırlar**: `iyzico_settings.api_key/secret_key`, `whatsapp_settings.access_token/webhook_verify_token` istemciden okunamaz (kolon yetkisi), yalnız yazılabilir. Servisler açık kolonları seçer; Ayarlar sayfasında boş bırakılan sır alanı mevcut değeri korur. Edge function'lar service_role ile okur; `IYZICO_*`, `WHATSAPP_*` function secret'ları tanımlanırsa onlar önceliklidir.
- Yeni tablo eklenirse RLS'i ve politikasını açıkça yaz (genel `DO` bloğu yalnız o migration anında vardı).

## Edge Functions (`supabase/functions`)
Ortak kod `_shared/security.ts` (`requireStaff` seçenekleri: `adminOnly`, `managementOnly`, varsayılan = tüm personel; `serviceClient`, kimlik bilgisi yardımcıları, HMAC).
| Fonksiyon | verify_jwt | Yetki |
|---|---|---|
| `admin-create-user` | true | yalnız admin; `role: "manager"` (yönetici) veya antrenör (`user`) hesabı + (antrenörse) antrenör kaydı (`branch_id` ile) birlikte oluşturur, hata olursa hesabı siler |
| `send-whatsapp` | true | yönetim (admin+yönetici); şablon (`template_type`/`template_id` ile bulunur), 24 saat içinde serbest metin/doküman/görsel |
| `analyze-performance` | true | tüm personel (antrenör dahil); `ANTHROPIC_API_KEY` yoksa `{configured:false}` döner, istemci kural tabanlı analize düşer (`ANTHROPIC_MODEL` opsiyonel) |
| `create-iyzico-payment` | true | yönetim |
| `process-scheduled-messages` | false | `x-cron-secret` = `CRON_SECRET` ya da yönetim JWT'si |
| `whatsapp-webhook` | false | GET doğrulama + `X-Hub-Signature-256` (`WHATSAPP_APP_SECRET` yoksa her isteği reddeder) |

`requireStaff` değişirse `_shared/security.ts`'i kullanan **tüm** fonksiyonlar yeniden deploy edilmeli (her fonksiyon kendi kopyasını taşır). MCP ile deploy ederken dosya adları `<fonksiyon>/index.ts` ve `_shared/security.ts`, entrypoint `<fonksiyon>/index.ts`. Yerel tip kontrolü: npm'den `deno` kur, `deno.land` ve `esm.sh` importlarını import-map ile stub'a / `npm:@supabase/supabase-js`'e yönlendirip `deno check` (sandbox bu hostlara çıkamıyor).

## Migration'lar
`supabase/migrations` canlıya **MCP `apply_migration`** ile uygulandı (Supabase CLI kullanılmıyor). Bu oturumda eklenenler:
- `20261102120000_security_hardening.sql`: roller, trigger'lar, RLS, sır kolonları
- `20261102120100_security_hardening_function_grants.sql`
- `20261102193000_coaches_specialty_optional.sql`
- `20261103090000_branches.sql`: şubeler (canlıya `apply_migration` ile `branches_feature` adıyla uygulandı)
- `20261103120000_roles_manager.sql`: yönetici rolü, rol yardımcıları, tüm RLS yeniden (canlıya `roles_manager_and_branch_rls` adıyla uygulandı; apply_migration 60 sn'de zaman aşımı gösterse de uygulanmıştı — her zaman `execute_sql` ile doğrula)

Eski seed migration (`20260226203219_…`) artık admin şifresini sıfırlamıyor.

## Canlı veri durumu
- Kullanıcılar: `orhunhoca@gmail.com` (**admin**, aynı zamanda antrenör kaydı "Orhun Güngördü") ve `ozgasl@gmail.com` (Özgür Aslan, `user`, antrenör). Demo hesapları (`admin@sportex.com`, `orhunhoca@hotmail.com`) silindi.
- Antrenör "Erhan Sarı" (`sarierhann@gmail.com`): giriş hesabı yok (`user_id` null); kullanıcı böyle kalmasını istedi.
- Birkaç test öğrencisi var. WhatsApp yapılandırılmamış, iyzico ayarı var ama pasif, pg_cron yok, storage bucket yok.

## Açık işler / bilinen sorunlar (öncelik sırasıyla)
1. **Admin şifresi**: `orhunhoca@gmail.com` hesabında oturumda verilen *geçici şifre* hâlâ geçerli (Ayarlar → Güvenlik'te değiştirme kaydedilmedi). Kullanıcı "böyle kalsın" dedi; uygun anda değiştirmesini hatırlat. Değerini hiçbir yere yazma.
2. **iyzico online ödeme çalışmıyor**: `src/pages/api/iyzico-callback.ts` oturumsuz anon client kullanıyor (RLS yüzünden ayarları/ödemeyi okuyamaz). `Authorization: IYZWS key:secret` iyzico'nun beklediği HMAC imzası (IYZWSv2) değil; aynı hata `create-iyzico-payment`'ta da var. Idempotency yok (çift kayıt riski). Callback'in sunucu tarafında service-role ile çalışması gerekiyor; bunun için Vercel'e `SUPABASE_SERVICE_ROLE_KEY` env gerekecek. Kullanıcıya önerilen sıradaki iş bu.
3. `send-whatsapp` yeniden yazıldı (şablon kolonları düzeltildi, telefon normalizasyonu, text/document/image). Performans raporu veliye `performance_report` şablonuyla gider (`mother_phone`/`father_phone`). Canlıda test edilmedi: WhatsApp bağlantısı + Meta şablon onayı gerekir; şablonlar Meta'da `template_id` adıyla (`performance_report`, `payment_reminder`, `attendance_notification`, `general_announcement`) oluşturulmalı. Şablon gövdeleri `whatsapp_templates.message_content`'te. Kurulum adımları ve Meta şablon metinleri: `docs/WHATSAPP_KURULUM.md`. Ödeme/yoklama/duyuru şablon değişken adları `whatsapp_templates.variables` ile eşleşir; Yoklama (`Velilere Bildir`) ve ödeme hatırlatması (`Ödeme Hatırlatması`) artık şablonla, personelin onayladığı diyalogla gider (otomatik değil; tekrar gönderim engellenir). Hâlâ serbest metin/doküman/görsel gönderenler (yalnızca 24 saat penceresinde teslim edilir): paymentService ödeme linki + iyzico-callback (iyzico düzeltilirken şablona çevrilecek: `payment_link`, `payment_success`), zamanlanmış mesajlar, doküman, galeri. Not: `sendCustomMessage` WhatsApp pasifken sessizce 'gönderildi' (simüle) döner — dikkat.
4. WhatsApp devreye alınırsa: `WHATSAPP_APP_SECRET` (zorunlu), zamanlayıcı için `CRON_SECRET` secret'ları + Meta webhook kurulumu.
5. (Çözüldü 2026-11-03) Antrenör erişimi daraltıldı: yalnız kendi şubesi, yoklama/öğrenci/performans/rapor. Kalan: öğrenci satırındaki ödeme kolonları API'de okunabilir (yukarıdaki sınırlama).
6. Teknik borç: test yok; kullanılmayan `stripe` / `@stripe/*` / `vercel` bağımlılıkları; `xlsx@0.18.5` bilinen açıklar; yaygın `console.log`; büyük dosyalar (`settings.tsx`, `StudentForm.tsx`); Ayarlar'da 7 sekme `grid-cols-4` içinde; `userService` içinde eski/ölü kod.
7. Supabase "leaked password protection" free planda yok.

## Doğrulayamadıklarım (kullanıcı yaptığını söyledi)
Supabase'de açık kaydın kapatılması ve Site URL / Redirect URL (`https://alltimesports.vercel.app`); GitHub, Supabase ve Vercel'de Softgen erişimlerinin kaldırılması.

## Hata ayıklama ipuçları
- Giriş/oturum: `query_logs` ile `auth_logs` + `edge_logs` (`/auth/v1/token`, `/auth/v1/user`). `_app` oturumu `authService.getValidSession()` ile sunucuya doğrular; silinmiş kullanıcının eski oturumu otomatik temizlenir.
- Kalıcı olmayan rol testi: `begin; select set_config('request.jwt.claims', json_build_object('sub', <id>, 'role', 'authenticated')::text, true); set local role authenticated; ...; rollback;`
- Postgres kısıt hataları `postgres_logs`'ta görünür (örn. antrenör ekleme hatası buradan bulundu).

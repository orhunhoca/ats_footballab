# Hukuki Metinler — İnceleme Notları

Sayfalar: `/kvkk` (Aydınlatma Metni), `/acik-riza` (Açık Rıza Metni, yazdırılabilir), `/cerez-politikasi`.
Metin kaynağı: `src/lib/legal.ts`. Şirket bilgileri **Ayarlar → Şirket ve Banka** bölümünden otomatik gelir
(`get_public_company_info()` — vergi bilgileri herkese açık sayfaya verilmez).

**Bu metinler bir şablondur, hukuki danışmanlık değildir.** Yayından önce bir avukat/KVKK danışmanı incelemeli;
sonra `LEGAL_DRAFT = false` yapılır (sayfadaki "taslak" uyarısı kalkar).

## Avukata sorulacak noktalar
1. **VERBİS yükümlülüğü**: çalışan sayısı / yıllık mali bilanço eşiklerine göre kayıt zorunlu mu? Zorunluysa sicil no Ayarlar'a girilir.
2. **Yurt dışına aktarım (KVKK m.9, 2024 değişikliği sonrası)**: Supabase (AB/Frankfurt), Vercel, Meta/WhatsApp ve (kullanılırsa) Anthropic.
   Düzenli aktarımlarda yalnızca açık rıza yeterli olmayabilir; yeterlilik kararı veya uygun güvence (standart sözleşme + Kurum'a bildirim) gerekebilir.
3. **Sağlık verisi** (özel nitelikli): sağlık raporu bilgisinin açık rıza ile işlenmesi, ek güvenlik tedbirleri.
4. **Çocuk fotoğraf/video**: okul içi paylaşım ile sosyal medya/tanıtım için ayrı rıza (metinde ayrı maddeler).
5. **Ticari elektronik ileti** (6563 sayılı Kanun): kampanya/duyuru mesajları için onay ve İYS kaydı gerekir; hizmet bilgilendirmeleri (yoklama, ödeme, rapor) ayrı tutuldu.
6. **Saklama süreleri**: metinde genel ifade var; kategori bazlı saklama-imha politikası gerekirse hazırlanmalı.
7. **Yapay zekâ analizi**: yalnızca kimliksiz ölçüm özeti gönderilir (ad/telefon yok); metinde belirtildi.

## Çerez politikası — doğruluk notu
Uygulama şu an **çerez kullanmaz**; oturum bilgisi (Supabase) ve şube tercihi tarayıcı yerel depolamasında tutulur, analitik/reklam yoktur.
Bu yüzden onay penceresi gösterilmiyor. İleride analitik (Google Analytics vb.) eklenirse politika güncellenmeli ve onay penceresi eklenmelidir.

## Veli kayıt formu
Kâğıt kayıt sürecinde `/acik-riza` sayfası yazdırılıp veliye imzalatılabilir. Veli erişim sayfası açıldığında onaylar sistemde tarih damgasıyla tutulacak (bkz. yol haritası).

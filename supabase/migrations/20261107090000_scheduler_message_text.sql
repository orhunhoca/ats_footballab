-- Otomatik mesajların metni yönetici tarafından düzenlenebilir.
-- Değişkenler {süslü parantez} içinde yazılır: {veli_adi} {ogrenci_adi} {tarih} {saat} {tutar} {yil}
ALTER TABLE public.message_scheduler_settings ADD COLUMN IF NOT EXISTS message_text text;

UPDATE public.message_scheduler_settings SET message_text = CASE setting_type
  WHEN 'training_reminder' THEN E'Merhaba {veli_adi} 👋\n\n{ogrenci_adi} için bugün saat {saat} antrenmanımız var. Görüşmek üzere!\n\nFootbalLab Futbol Okulu'
  WHEN 'payment_reminder' THEN E'Merhaba {veli_adi} 👋\n\n{ogrenci_adi} için {tarih} tarihinde ödenecek {tutar} TL tutarındaki ödemeniz bulunmaktadır.\n\nSorularınız için bize WhatsApp üzerinden yazabilirsiniz.\n\nFootbalLab Futbol Okulu'
  WHEN 'birthday_greeting' THEN E'Merhaba {veli_adi} 🎂\n\n{ogrenci_adi}''in doğum gününü kutlar, nice mutlu ve sağlıklı yıllar dileriz!\n\nFootbalLab Futbol Okulu'
  WHEN 'anniversary_greeting' THEN E'Merhaba {veli_adi} ⚽\n\n{ogrenci_adi} ile birlikte {yil}. yılımızı tamamladık. Bize güvendiğiniz için teşekkür ederiz!\n\nFootbalLab Futbol Okulu'
END
WHERE message_text IS NULL AND setting_type IN ('training_reminder','payment_reminder','birthday_greeting','anniversary_greeting');

-- FootbalLab: marka adı ve WhatsApp şablonları
-- Not: Meta'da şablonlar bu metinlerle AYNI oluşturulmalı (template_id = Meta'daki şablon adı).
-- Gövdeler değişken ile başlayıp bitmez (Meta kuralı).

-- 1) Yeni şablon türü
alter table public.whatsapp_templates drop constraint if exists whatsapp_templates_template_type_check;
alter table public.whatsapp_templates add constraint whatsapp_templates_template_type_check
  check (template_type = any (array['payment_reminder','attendance_notification','general_announcement','performance_report','custom']));

-- 2) Mevcut şablonlar: yeni metin, Meta şablon adı, durum = Meta onayı bekliyor
update public.whatsapp_templates set
  template_id = 'payment_reminder', status = 'pending', updated_at = now(),
  message_content = E'Merhaba {{1}} 👋\n\n{{2}} için {{3}} tarihinde ödenecek {{4}} TL tutarındaki ödemeniz bulunmaktadır.\n\nSorularınız için bize WhatsApp üzerinden yazabilirsiniz.\n\nFootbalLab Futbol Okulu'
where template_type = 'payment_reminder';

update public.whatsapp_templates set
  template_id = 'attendance_notification', status = 'pending', updated_at = now(),
  message_content = E'Merhaba {{1}} 👋\n\n{{2}} bugünkü antrenmanımıza {{3}}.\n\nİyi günler dileriz.\nFootbalLab Futbol Okulu'
where template_type = 'attendance_notification';

update public.whatsapp_templates set
  template_id = 'general_announcement', status = 'pending', updated_at = now(),
  message_content = E'Merhaba, sayın velimiz 👋\n\n{{1}}\n\nSevgilerimizle,\nFootbalLab Futbol Okulu'
where template_type = 'general_announcement';

-- 3) Performans raporu şablonu
insert into public.whatsapp_templates (template_name, template_id, template_type, message_content, variables, language, status)
select 'Performans Raporu', 'performance_report', 'performance_report',
  E'Merhaba {{1}} 👋\n\n{{2}} için {{3}} tarihli performans test sonuçları hazır:\n\n📊 {{4}}\n\n💬 Antrenör değerlendirmesi: {{5}}\n\nGelişimi birlikte takip etmeye devam ediyoruz.\nFootbalLab Futbol Okulu',
  '["parent_name","student_name","test_date","results","evaluation"]'::jsonb, 'tr', 'pending'
where not exists (select 1 from public.whatsapp_templates where template_type = 'performance_report');

-- 4) Belge şablonlarındaki eski marka adı
update public.document_templates
set template_content = replace(replace(template_content::text, 'Sportex', 'FootbalLab'), 'SPORTEX', 'FOOTBALLAB')::jsonb
where template_content::text ilike '%sportex%';

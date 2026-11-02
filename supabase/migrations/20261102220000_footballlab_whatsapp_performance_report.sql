-- FootballLab: marka adı, WhatsApp şablonları ve performans raporu şablonu

-- 1) Yeni şablon türü
alter table public.whatsapp_templates drop constraint if exists whatsapp_templates_template_type_check;
alter table public.whatsapp_templates add constraint whatsapp_templates_template_type_check
  check (template_type = any (array['payment_reminder','attendance_notification','general_announcement','performance_report','custom']));

-- 2) Marka adı (Sportex -> FootballLab)
update public.whatsapp_templates
set message_content = replace(replace(message_content, 'Sportex', 'FootballLab'), 'SPORTEX', 'FOOTBALLLAB');

update public.document_templates
set template_content = replace(replace(template_content::text, 'Sportex', 'FootballLab'), 'SPORTEX', 'FOOTBALLLAB')::jsonb
where template_content::text ilike '%sportex%';

-- 3) template_id = Meta'daki şablon adı. Meta onayı olmadan "approved" göstermek yanıltıcı;
--    gerçek onay Meta Business Manager'da verilir, gönderimi Meta doğrular.
update public.whatsapp_templates
set template_id = coalesce(template_id, template_type), status = 'pending'
where template_type in ('payment_reminder', 'attendance_notification', 'general_announcement');

-- 4) Performans raporu şablonu (Meta'da aynı ad ve gövdeyle oluşturulmalı)
insert into public.whatsapp_templates (template_name, template_id, template_type, message_content, variables, language, status)
select 'Performans Raporu', 'performance_report', 'performance_report',
  'Sayın {{1}}, {{2}} adlı öğrencimizin {{3}} tarihli performans test sonuçları: {{4}} Değerlendirme: {{5}} FootballLab Futbol Okulu',
  '["parent_name","student_name","test_date","results","evaluation"]'::jsonb, 'tr', 'pending'
where not exists (select 1 from public.whatsapp_templates where template_type = 'performance_report');

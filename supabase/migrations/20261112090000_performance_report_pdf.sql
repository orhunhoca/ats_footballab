-- Performans raporu PDF'i: özel depo + WhatsApp şablonu (başlığında PDF belgesi)

-- 1) Özel depo: yalnız yönetim yükler/okur/siler; veliye 24 saatlik imzalı bağlantı gider
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "reports_management_all" on storage.objects;
create policy "reports_management_all" on storage.objects for all to authenticated
  using (bucket_id = 'reports' and public.is_management())
  with check (bucket_id = 'reports' and public.is_management());

-- 2) Yeni şablon türü
alter table public.whatsapp_templates drop constraint if exists whatsapp_templates_template_type_check;
alter table public.whatsapp_templates add constraint whatsapp_templates_template_type_check
  check (template_type = any (array['payment_reminder','attendance_notification','general_announcement','performance_report','performance_report_pdf','custom']));

-- 3) PDF'li performans raporu şablonu (Meta'da başlık türü DOCUMENT olarak oluşturulur)
insert into public.whatsapp_templates (template_name, template_id, template_type, message_content, variables, language, status)
select 'Performans Raporu (PDF)', 'performance_report_pdf', 'performance_report_pdf',
  E'Merhaba {{1}} 👋\n\n{{2}} için {{3}} tarihli performans raporu ekte PDF olarak paylaşılmıştır.\n\n💬 Antrenör değerlendirmesi: {{4}}\n\nGelişimi birlikte takip etmeye devam ediyoruz.\nFootbalLab Futbol Okulu',
  '["parent_name","student_name","test_date","evaluation"]'::jsonb, 'tr', 'pending'
where not exists (select 1 from public.whatsapp_templates where template_type = 'performance_report_pdf');

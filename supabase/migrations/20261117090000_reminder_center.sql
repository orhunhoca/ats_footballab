-- Bildirim Merkezi: kayıt formu takibi, hatırlatma şablonları ve otomatik hatırlatma kuralları

-- 1) Kayıt formu teslim durumu (sağlık raporu gibi elle işaretlenir)
alter table public.students add column if not exists registration_form_submitted boolean not null default false;

-- 2) Hatırlatma şablonları (Meta'da aynı adla oluşturulmalı; değişkenler sistem tarafından doldurulur)
alter table public.whatsapp_templates drop constraint if exists whatsapp_templates_template_type_check;
alter table public.whatsapp_templates add constraint whatsapp_templates_template_type_check
  check (template_type = any (array['payment_reminder','attendance_notification','general_announcement','performance_report','performance_report_pdf','health_report_reminder','registration_form_reminder','trial_reminder','custom']));

insert into public.whatsapp_templates (template_name, template_id, template_type, message_content, variables, language, status)
select * from (values
  ('Sağlık Raporu Hatırlatması', 'health_report_reminder', 'health_report_reminder',
   E'Merhaba {{1}} 👋\n\n{{2}} için sağlık raporu henüz okulumuza ulaşmadı. Antrenmanlara güvenle devam edebilmesi için raporu en kısa sürede iletmenizi rica ederiz.\n\nFootbalLab Futbol Okulu',
   '["parent_name","student_name"]'::jsonb, 'tr', 'pending'),
  ('Kayıt Formu Hatırlatması', 'registration_form_reminder', 'registration_form_reminder',
   E'Merhaba {{1}} 👋\n\n{{2}} için kayıt formu henüz tamamlanmamış görünüyor. Formu okulumuza ulaştırmanızı rica ederiz.\n\nFootbalLab Futbol Okulu',
   '["parent_name","student_name"]'::jsonb, 'tr', 'pending'),
  ('Deneme Antrenmanı Hatırlatması', 'trial_reminder', 'trial_reminder',
   E'Merhaba {{1}} 👋\n\n{{2}} için deneme antrenmanımız {{3}} tarihinde, {{4}}. Sizi bekliyoruz!\n\nFootbalLab Futbol Okulu',
   '["parent_name","student_name","trial_date","group_info"]'::jsonb, 'tr', 'pending')
) as v(template_name, template_id, template_type, message_content, variables, language, status)
where not exists (select 1 from public.whatsapp_templates t where t.template_type = v.template_type);

-- 3) Otomatik hatırlatma kuralları (varsayılan KAPALI; admin açar)
create table if not exists public.reminder_rules (
  rule_type text primary key check (rule_type in ('balance','health_report','registration_form','trial_lesson')),
  enabled boolean not null default false,
  -- balance: vadesi bu kadar gün içinde gelen ya da geçmiş borç; trial_lesson: deneme tarihinden kaç gün önce
  days_before integer check (days_before is null or days_before between 0 and 60),
  -- aynı veliye aynı hatırlatmayı en erken kaç günde bir gönder (deneme hatırlatması her deneme için bir kez gider)
  repeat_days integer check (repeat_days is null or repeat_days between 1 and 90),
  template_type text not null,
  updated_at timestamptz not null default now()
);
alter table public.reminder_rules enable row level security;
drop policy if exists reminder_rules_read on public.reminder_rules;
drop policy if exists reminder_rules_admin_write on public.reminder_rules;
create policy reminder_rules_read on public.reminder_rules for select to authenticated using (public.is_management());
create policy reminder_rules_admin_write on public.reminder_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.reminder_rules (rule_type, enabled, days_before, repeat_days, template_type) values
  ('balance', false, 7, 7, 'payment_reminder'),
  ('health_report', false, null, 14, 'health_report_reminder'),
  ('registration_form', false, null, 14, 'registration_form_reminder'),
  ('trial_lesson', false, 1, null, 'trial_reminder')
on conflict (rule_type) do nothing;

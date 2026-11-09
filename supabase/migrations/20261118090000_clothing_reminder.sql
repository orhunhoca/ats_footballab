-- Kıyafet ücreti hatırlatması: şablon + otomatik kural türü

alter table public.whatsapp_templates drop constraint if exists whatsapp_templates_template_type_check;
alter table public.whatsapp_templates add constraint whatsapp_templates_template_type_check
  check (template_type = any (array['payment_reminder','attendance_notification','general_announcement','performance_report','performance_report_pdf','health_report_reminder','registration_form_reminder','trial_reminder','clothing_reminder','custom']));

insert into public.whatsapp_templates (template_name, template_id, template_type, message_content, variables, language, status)
select 'Kıyafet Ücreti Hatırlatması', 'clothing_reminder', 'clothing_reminder',
  E'Merhaba {{1}} 👋\n\n{{2}} için kıyafet ücreti henüz ödenmemiş görünüyor. Ödemeyi okulumuza iletmenizi rica ederiz.\n\nFootbalLab Futbol Okulu',
  '["parent_name","student_name"]'::jsonb, 'tr', 'pending'
where not exists (select 1 from public.whatsapp_templates t where t.template_type = 'clothing_reminder');

alter table public.reminder_rules drop constraint if exists reminder_rules_rule_type_check;
alter table public.reminder_rules add constraint reminder_rules_rule_type_check
  check (rule_type in ('balance','health_report','registration_form','trial_lesson','clothing'));
insert into public.reminder_rules (rule_type, enabled, days_before, repeat_days, template_type)
values ('clothing', false, null, 14, 'clothing_reminder')
on conflict (rule_type) do nothing;

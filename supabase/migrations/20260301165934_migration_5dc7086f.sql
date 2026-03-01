-- Update CHECK constraint to include anniversary_greeting
ALTER TABLE message_scheduler_settings 
DROP CONSTRAINT message_scheduler_settings_setting_type_check;

ALTER TABLE message_scheduler_settings
ADD CONSTRAINT message_scheduler_settings_setting_type_check 
CHECK (setting_type IN ('training_reminder', 'payment_reminder', 'birthday_greeting', 'anniversary_greeting'));

-- Now insert default settings including anniversary
INSERT INTO message_scheduler_settings (setting_type, enabled, hours_before, days_before, template_name)
VALUES 
  ('training_reminder', true, 1, NULL, 'training_reminder'),
  ('payment_reminder', true, NULL, 15, 'payment_reminder'),
  ('birthday_greeting', true, NULL, NULL, 'birthday_greeting'),
  ('anniversary_greeting', true, NULL, NULL, 'anniversary_greeting')
ON CONFLICT (setting_type) DO NOTHING;
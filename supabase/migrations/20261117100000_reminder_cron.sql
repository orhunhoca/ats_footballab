-- Günlük otomatik hatırlatma zamanlayıcısı (pg_cron → pg_net → send-reminders)
-- Çağrı anahtarı Supabase Vault'ta ('reminders_cron_secret') saklanır; bu dosyada anahtar YOKTUR.
-- Anahtar yoksa zamanlayıcı hiçbir şey yapmaz. Oluşturma: select vault.create_secret(encode(gen_random_bytes(24),'hex'), 'reminders_cron_secret');

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Edge Function, gelen x-cron-secret başlığını bununla doğrular (yalnız service_role çağırabilir)
create or replace function public.verify_reminders_cron_secret(p text) returns boolean
language sql stable security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'reminders_cron_secret' and decrypted_secret = p);
$$;
revoke all on function public.verify_reminders_cron_secret(text) from public, anon, authenticated;
grant execute on function public.verify_reminders_cron_secret(text) to service_role;

create or replace function public.run_daily_reminders() returns void
language plpgsql security definer set search_path = public, vault as $$
declare secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'reminders_cron_secret' limit 1;
  if secret is null then return; end if;
  perform net.http_post(
    url := 'https://mhkvdpqwnuzvbuezrwgf.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('mode', 'send'),
    timeout_milliseconds := 60000
  );
end $$;
revoke all on function public.run_daily_reminders() from public, anon, authenticated;

-- Her gün 09:00 (Türkiye) = 06:00 UTC
select cron.schedule('daily-reminders', '0 6 * * *', 'select public.run_daily_reminders()');

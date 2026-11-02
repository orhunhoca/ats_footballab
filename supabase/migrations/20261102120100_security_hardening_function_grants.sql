-- Trigger fonksiyonları ve iç yardımcılar REST/RPC üzerinden çağrılamasın.
-- (Trigger'lar EXECUTE yetkisinden bağımsız çalışmaya devam eder.)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;

-- is_admin()/is_staff() SECURITY DEFINER olarak bunu sahibinin yetkisiyle çağırır.
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM authenticated;

-- Linter uyarısı: search_path sabitlenmemiş mevcut fonksiyon
ALTER FUNCTION public.check_registration_renewals() SET search_path = public;

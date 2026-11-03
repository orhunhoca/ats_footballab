-- Veli rolü yardımcısı: politikalar current_user_role()'ü doğrudan çağıramaz (yalnızca iç fonksiyonlara açık)
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(public.current_user_role() = 'parent', false) $$;
REVOKE ALL ON FUNCTION public.is_parent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent() TO authenticated, service_role;

DROP POLICY IF EXISTS "parent_insert_own" ON public.consents;
CREATE POLICY "parent_insert_own" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND source = 'portal' AND public.is_parent());

-- =====================================================================
-- Güvenlik sıkılaştırması
--   1) Kayıt sırasında rol yükseltme açığını kapatır
--   2) Tüm public tablolardaki RLS politikalarını baştan yazar
--      (anon: erişim yok, personel: operasyonel veriler, admin: ayarlar)
--   3) iyzico / WhatsApp sırlarını istemciden okunamaz (yalnızca yazılabilir) yapar
--
-- Rol modeli (profiles.role):
--   admin   -> tam yetki
--   user    -> personel / antrenör (operasyonel verilere erişir)
--   pending -> yeni kayıt, admin onaylayana kadar hiçbir veriye erişemez
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Yardımcı fonksiyonlar (SECURITY DEFINER: profiles RLS'ine takılmaz)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'user'), false)
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. Roller ve kayıt trigger'ı
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'user' WHERE role = 'coach';
UPDATE public.profiles SET role = 'pending' WHERE role IS NULL OR role NOT IN ('admin', 'user');
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'pending';
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user', 'pending'));

-- Yeni kullanıcılar ne gönderirse göndersin 'pending' rolüyle başlar.
-- (Önceki sürüm rolü kullanıcı tarafından gönderilen metadata'dan alıyordu.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'pending',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Rol yalnızca admin (veya service_role / SQL editörü) tarafından değiştirilebilir.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Rol değiştirme yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profil kimliği değiştirilemez' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ---------------------------------------------------------------------
-- 2. RLS politikalarını baştan yaz
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r record;
  -- Personel okuyabilir, yalnızca admin yazabilir
  admin_write_tables text[] := ARRAY[
    'settings',
    'payment_plans',
    'schools',
    'document_templates',
    'whatsapp_templates',
    'message_scheduler_settings',
    'iyzico_settings',
    'whatsapp_settings'
  ];
  -- Yalnızca admin
  admin_only_tables text[] := ARRAY['users'];
BEGIN
  -- Mevcut tüm politikaları kaldır (çoğu USING (true) idi)
  FOR r IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);

    IF r.tablename = 'profiles' THEN
      CONTINUE; -- aşağıda ayrıca tanımlanıyor

    ELSIF r.tablename = ANY (admin_only_tables) THEN
      EXECUTE format(
        'CREATE POLICY "admin_all" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        r.tablename);

    ELSIF r.tablename = ANY (admin_write_tables) THEN
      EXECUTE format(
        'CREATE POLICY "staff_select" ON public.%I FOR SELECT TO authenticated USING (public.is_staff())',
        r.tablename);
      EXECUTE format(
        'CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
        r.tablename);
      EXECUTE format(
        'CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        r.tablename);
      EXECUTE format(
        'CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
        r.tablename);

    ELSE
      EXECUTE format(
        'CREATE POLICY "staff_all" ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())',
        r.tablename);
    END IF;
  END LOOP;
END $$;

-- profiles: kişi kendi satırını görür/günceller, admin hepsini yönetir.
-- INSERT politikası yok: profiller yalnızca handle_new_user trigger'ı ile oluşur.
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Entegrasyon sırları: istemciden yazılabilir ama okunamaz
--    (Edge function'lar service_role ile okur.)
-- ---------------------------------------------------------------------
REVOKE ALL ON public.iyzico_settings FROM anon, authenticated;
GRANT SELECT (id, base_url, is_active, created_at, updated_at)
  ON public.iyzico_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.iyzico_settings TO authenticated;

REVOKE ALL ON public.whatsapp_settings FROM anon, authenticated;
GRANT SELECT (id, phone_number_id, business_account_id, is_active, created_at, updated_at)
  ON public.whatsapp_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;

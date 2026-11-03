-- =====================================================================
-- Veli kaydı altyapısı (davet kodu + zorunlu KVKK onayı)
--   * profiles.role 'parent' (veli). Veli hiçbir operasyonel tabloya erişmez (is_staff/is_management dışında);
--     yalnızca kendi çocuklarına ait sınırlı bilgiyi get_my_children() ile görür.
--   * parent_invites : öğrenci başına davet kodları (yalnızca SHA-256 özeti saklanır; kod bir kez gösterilir)
--   * parent_students: veli hesabı <-> öğrenci bağlantısı
--   * consents       : KVKK / açık rıza kayıtları (belge sürümü, tarih, IP, kaynak)
--   * registration_attempts: kod deneme sınırı (yalnızca servis rolü)
--   * company_settings.parent_portal_enabled: veli kaydını açma/kapama anahtarı (varsayılan KAPALI)
--   * students.kvkk_consent_at/by: personelin öğrenci kaydı sırasında aldığı KVKK onayı
-- =====================================================================

-- 1) Rol
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'user', 'parent', 'pending'));

-- 2) Veli kaydı anahtarı + herkese açık okunabilir durum
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS parent_portal_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_parent_registration_open()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT parent_portal_enabled FROM public.company_settings LIMIT 1), false) $$;
REVOKE ALL ON FUNCTION public.is_parent_registration_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_parent_registration_open() TO anon, authenticated, service_role;

-- 3) Personelin aldığı KVKK onayı (öğrenci kaydı)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS kvkk_consent_at timestamptz;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS kvkk_consent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4) Veli <-> öğrenci
CREATE TABLE IF NOT EXISTS public.parent_students (
  parent_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_user_id, student_id)
);
CREATE INDEX IF NOT EXISTS parent_students_student_idx ON public.parent_students (student_id);
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_students FROM anon;
DROP POLICY IF EXISTS "management_all" ON public.parent_students;
DROP POLICY IF EXISTS "parent_select_own" ON public.parent_students;
CREATE POLICY "management_all" ON public.parent_students FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());
CREATE POLICY "parent_select_own" ON public.parent_students FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

-- 5) Davet kodları (yazma yalnızca aşağıdaki fonksiyonlarla)
CREATE TABLE IF NOT EXISTS public.parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 2 CHECK (max_uses BETWEEN 1 AND 5),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parent_invites_student_idx ON public.parent_invites (student_id);
ALTER TABLE public.parent_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_invites FROM anon;
DROP POLICY IF EXISTS "management_select" ON public.parent_invites;
CREATE POLICY "management_select" ON public.parent_invites FOR SELECT TO authenticated USING (public.is_management());

-- Kod üret: 8 karakter (karışabilecek I,O,0,1 yok), yalnızca özet saklanır, kod bir kez döner.
-- Öğrencinin önceki aktif davetleri iptal edilir.
CREATE OR REPLACE FUNCTION public.create_parent_invite(p_student_id uuid, p_max_uses integer DEFAULT 2, p_days integer DEFAULT 14)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  raw text := '';
  i int;
BEGIN
  IF NOT public.is_management() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RAISE EXCEPTION 'Öğrenci bulunamadı';
  END IF;
  IF p_max_uses < 1 OR p_max_uses > 5 THEN RAISE EXCEPTION 'Kullanım hakkı 1-5 arasında olmalı'; END IF;
  IF p_days < 1 OR p_days > 90 THEN RAISE EXCEPTION 'Geçerlilik 1-90 gün arasında olmalı'; END IF;

  bytes := gen_random_bytes(8);
  FOR i IN 0..7 LOOP
    raw := raw || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1); -- 256 % 32 = 0: eğilimsiz
  END LOOP;

  UPDATE public.parent_invites SET is_active = false WHERE student_id = p_student_id AND is_active;
  INSERT INTO public.parent_invites (student_id, code_hash, max_uses, expires_at, created_by)
  VALUES (p_student_id, encode(digest(raw, 'sha256'), 'hex'), p_max_uses, now() + make_interval(days => p_days), auth.uid());

  RETURN substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
END;
$$;
REVOKE ALL ON FUNCTION public.create_parent_invite(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_parent_invite(uuid, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_parent_invite(p_invite_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_management() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  UPDATE public.parent_invites SET is_active = false WHERE id = p_invite_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_parent_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_parent_invite(uuid) TO authenticated, service_role;

-- Öğrencinin bağlı veli hesapları (yönetim; profiles'a doğrudan erişmeden)
CREATE OR REPLACE FUNCTION public.list_student_parents(p_student_id uuid)
RETURNS TABLE (parent_user_id uuid, full_name text, email text, relation text, linked_at timestamptz, is_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_management() THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT ps.parent_user_id, p.full_name, p.email, ps.relation, ps.created_at, (p.role = 'parent')
    FROM public.parent_students ps JOIN public.profiles p ON p.id = ps.parent_user_id
    WHERE ps.student_id = p_student_id
    ORDER BY ps.created_at;
END;
$$;
REVOKE ALL ON FUNCTION public.list_student_parents(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_student_parents(uuid) TO authenticated, service_role;

-- Velinin kendi çocukları (yalnızca sınırlı alanlar: ad, şube, gruplar)
CREATE OR REPLACE FUNCTION public.get_my_children()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'student_id', s.id,
    'name', s.name,
    'relation', ps.relation,
    'branch_name', b.name,
    'groups', COALESCE((
      SELECT jsonb_agg(g.name ORDER BY g.name)
      FROM public.student_groups sg JOIN public.groups g ON g.id = sg.group_id
      WHERE sg.student_id = s.id), '[]'::jsonb)
  ) ORDER BY s.name), '[]'::jsonb)
  FROM public.parent_students ps
  JOIN public.students s ON s.id = ps.student_id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  WHERE ps.parent_user_id = auth.uid()
    AND public.current_user_role() = 'parent'
$$;
REVOKE ALL ON FUNCTION public.get_my_children() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated, service_role;

-- 6) Onay kayıtları (KVKK / açık rıza)
CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'kvkk_aydinlatma', 'acik_riza_saglik', 'acik_riza_medya_ici', 'acik_riza_medya_sosyal',
    'acik_riza_whatsapp', 'acik_riza_ticari_ileti', 'acik_riza_yurtdisi')),
  document_version text NOT NULL,
  accepted boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  source text NOT NULL DEFAULT 'portal' CHECK (source IN ('parent_registration', 'portal'))
);
CREATE INDEX IF NOT EXISTS consents_user_idx ON public.consents (user_id, document_type, accepted_at DESC);
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consents FROM anon;
DROP POLICY IF EXISTS "management_select" ON public.consents;
DROP POLICY IF EXISTS "parent_select_own" ON public.consents;
DROP POLICY IF EXISTS "parent_insert_own" ON public.consents;
CREATE POLICY "management_select" ON public.consents FOR SELECT TO authenticated USING (public.is_management());
CREATE POLICY "parent_select_own" ON public.consents FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Veli, portalda yeni sürümü / tercihlerini kendisi onaylayabilir (yalnızca kendi adına, kaynak 'portal')
CREATE POLICY "parent_insert_own" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND source = 'portal' AND public.current_user_role() = 'parent');

-- 7) Kod deneme sınırı (yalnızca servis rolü: politika yok)
CREATE TABLE IF NOT EXISTS public.registration_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS registration_attempts_ip_idx ON public.registration_attempts (ip, created_at DESC);
ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_attempts FROM anon, authenticated;

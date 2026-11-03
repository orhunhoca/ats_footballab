-- =====================================================================
-- Roller ve yetkiler
--   admin   : her şeyi girer/yönetir (şube, antrenör, şablon, ayarlar) ve yönetici atar
--   manager : (yönetici) tüm şubelerin öğrenci, yoklama, ödeme, rapor verilerine ulaşır ve
--             operasyonel kayıt girer; şube/antrenör/şablon/ayar yönetemez, rol atayamaz
--   user    : (antrenör) yalnızca kendi şubesinin öğrenci bilgileri (salt okunur),
--             yoklama ve performans testlerine ulaşır; ödeme/iletişim/ayar göremez
--   pending : hiçbir şeye erişemez
-- =====================================================================

-- 1) Rol kısıtı
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'user', 'pending'));

-- 2) Yardımcı fonksiyonlar
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(public.current_user_role() IN ('admin', 'manager', 'user'), false) $$;

-- admin + yönetici
CREATE OR REPLACE FUNCTION public.is_management()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(public.current_user_role() IN ('admin', 'manager'), false) $$;

-- Antrenörün (giriş yapan kullanıcının) şubesi
CREATE OR REPLACE FUNCTION public.current_coach_branch_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch_id FROM public.coaches
  WHERE user_id = auth.uid() AND COALESCE(status, 'Aktif') = 'Aktif'
  ORDER BY created_at LIMIT 1
$$;

-- Yönetim her şubeye, antrenör yalnızca kendi şubesine erişir
CREATE OR REPLACE FUNCTION public.can_access_branch(b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_management()
      OR (public.is_staff() AND b IS NOT NULL AND b = public.current_coach_branch_id())
$$;

REVOKE ALL ON FUNCTION public.is_management() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_coach_branch_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_branch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_management() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_coach_branch_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid) TO authenticated, service_role;

-- 3) Politikalar (profiles ve users hariç hepsi baştan)
DO $$
DECLARE
  r record;
  t text;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename NOT IN ('profiles', 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;

  -- Yalnızca yönetim (admin + yönetici): ödeme, iletişim, deneme öğrencileri
  FOREACH t IN ARRAY ARRAY[
    'payment_history', 'online_payments', 'scheduled_messages', 'whatsapp_messages',
    'whatsapp_media', 'whatsapp_chatbot_logs', 'notifications', 'trial_students'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "management_all" ON public.%I FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management())', t);
  END LOOP;

  -- Yönetim okur, yalnızca admin yazar: ayarlar ve şablonlar
  FOREACH t IN ARRAY ARRAY[
    'settings', 'payment_plans', 'document_templates', 'whatsapp_templates',
    'message_scheduler_settings', 'iyzico_settings', 'whatsapp_settings'
  ] LOOP
    EXECUTE format('CREATE POLICY "management_select" ON public.%I FOR SELECT TO authenticated USING (public.is_management())', t);
    EXECUTE format('CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t);
  END LOOP;

  -- Personel okur, yalnızca admin yazar: şubeler, test protokolleri
  FOREACH t IN ARRAY ARRAY['branches', 'test_protocols'] LOOP
    EXECUTE format('CREATE POLICY "staff_select" ON public.%I FOR SELECT TO authenticated USING (public.is_staff())', t);
    EXECUTE format('CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
    EXECUTE format('CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t);
  END LOOP;

  -- Personel okur, yönetim yazar: antrenman içerikleri
  FOREACH t IN ARRAY ARRAY['training_programs', 'training_exercises', 'group_training_assignments'] LOOP
    EXECUTE format('CREATE POLICY "staff_select" ON public.%I FOR SELECT TO authenticated USING (public.is_staff())', t);
    EXECUTE format('CREATE POLICY "management_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_management())', t);
    EXECUTE format('CREATE POLICY "management_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_management()) WITH CHECK (public.is_management())', t);
    EXECUTE format('CREATE POLICY "management_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_management())', t);
  END LOOP;
END $$;

-- Okullar: personel okur, yönetim ekler (öğrenci formunda yeni okul yazılabilir), admin düzenler/siler
CREATE POLICY "staff_select" ON public.schools FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "management_insert" ON public.schools FOR INSERT TO authenticated WITH CHECK (public.is_management());
CREATE POLICY "admin_update" ON public.schools FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.schools FOR DELETE TO authenticated USING (public.is_admin());

-- Antrenörler: şubesine göre okunur, yalnızca admin girer
CREATE POLICY "coaches_select" ON public.coaches FOR SELECT TO authenticated USING (public.can_access_branch(branch_id));
CREATE POLICY "admin_insert" ON public.coaches FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.coaches FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.coaches FOR DELETE TO authenticated USING (public.is_admin());

-- Öğrenciler: şubesine göre okunur, yönetim yazar
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated USING (public.can_access_branch(branch_id));
CREATE POLICY "management_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (public.is_management());
CREATE POLICY "management_update" ON public.students FOR UPDATE TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());
CREATE POLICY "management_delete" ON public.students FOR DELETE TO authenticated USING (public.is_management());

-- Gruplar: şubesine göre okunur, yönetim yazar
CREATE POLICY "groups_select" ON public.groups FOR SELECT TO authenticated USING (public.can_access_branch(branch_id));
CREATE POLICY "management_insert" ON public.groups FOR INSERT TO authenticated WITH CHECK (public.is_management());
CREATE POLICY "management_update" ON public.groups FOR UPDATE TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());
CREATE POLICY "management_delete" ON public.groups FOR DELETE TO authenticated USING (public.is_management());

-- Öğrenci-grup ve grup programı: grubun şubesine göre okunur, yönetim yazar
CREATE POLICY "student_groups_select" ON public.student_groups FOR SELECT TO authenticated
  USING (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = student_groups.group_id AND public.can_access_branch(g.branch_id)));
CREATE POLICY "management_insert" ON public.student_groups FOR INSERT TO authenticated WITH CHECK (public.is_management());
CREATE POLICY "management_update" ON public.student_groups FOR UPDATE TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());
CREATE POLICY "management_delete" ON public.student_groups FOR DELETE TO authenticated USING (public.is_management());

CREATE POLICY "group_schedule_select" ON public.group_schedule FOR SELECT TO authenticated
  USING (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_schedule.group_id AND public.can_access_branch(g.branch_id)));
CREATE POLICY "management_insert" ON public.group_schedule FOR INSERT TO authenticated WITH CHECK (public.is_management());
CREATE POLICY "management_update" ON public.group_schedule FOR UPDATE TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());
CREATE POLICY "management_delete" ON public.group_schedule FOR DELETE TO authenticated USING (public.is_management());

-- Yoklama: yönetim hepsini, antrenör kendi şubesindeki grupların yoklamasını okur/yazar
CREATE POLICY "attendance_access" ON public.attendance FOR ALL TO authenticated
  USING (public.is_management() OR (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = attendance.group_id AND public.can_access_branch(g.branch_id))))
  WITH CHECK (public.is_management() OR (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = attendance.group_id AND public.can_access_branch(g.branch_id))));

-- Performans testleri: yönetim hepsini, antrenör kendi şubesindeki öğrencilerinkini okur/yazar
CREATE POLICY "performance_tests_access" ON public.performance_tests FOR ALL TO authenticated
  USING (public.is_management() OR (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = performance_tests.student_id AND public.can_access_branch(s.branch_id))))
  WITH CHECK (public.is_management() OR (public.is_staff() AND EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = performance_tests.student_id AND public.can_access_branch(s.branch_id))));

-- =====================================================================
-- Antrenör şube yetkisi + antrenör kayıt girişi
--   coaches.branch_access: 'own' (yalnızca kendi şubesi) | 'all' (tüm şubeler)
--     Antrenörler şubeler arası geçiş yapabildiği için yetkiyi admin, antrenörü eklerken
--     veya düzenlerken seçer.
--   Antrenör (yönetici sahada olmayabilir), erişebildiği şubelere öğrenci ve deneme
--   öğrencisi ekleyebilir/düzenleyebilir; silemez, ödeme kaydı oluşturamaz.
-- =====================================================================

-- 1) Şube yetkisi
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS branch_access text NOT NULL DEFAULT 'own';
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_branch_access_check;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_branch_access_check CHECK (branch_access IN ('own', 'all'));

CREATE OR REPLACE FUNCTION public.current_coach_branch_access()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch_access FROM public.coaches
  WHERE user_id = auth.uid() AND COALESCE(status, 'Aktif') = 'Aktif'
  ORDER BY created_at LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.current_coach_branch_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_coach_branch_access() TO authenticated, service_role;

-- Yönetim her şubeye; antrenör: yetkisi 'all' ise her şubeye, 'own' ise yalnızca kendi şubesine
CREATE OR REPLACE FUNCTION public.can_access_branch(b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_management()
      OR (public.is_staff() AND (
            public.current_coach_branch_access() = 'all'
            OR (b IS NOT NULL AND b = public.current_coach_branch_id())
          ))
$$;

-- 2) Öğrenciler: ekleme/güncelleme -> şubeye erişimi olan herkes (silme yalnızca yönetim)
DROP POLICY IF EXISTS "management_insert" ON public.students;
DROP POLICY IF EXISTS "management_update" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "students_update" ON public.students FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id)) WITH CHECK (public.can_access_branch(branch_id));

-- 3) Öğrenci-grup ilişkisi: grup erişilebilir şubedeyse
DROP POLICY IF EXISTS "management_insert" ON public.student_groups;
DROP POLICY IF EXISTS "management_update" ON public.student_groups;
DROP POLICY IF EXISTS "management_delete" ON public.student_groups;
DROP POLICY IF EXISTS "student_groups_insert" ON public.student_groups;
DROP POLICY IF EXISTS "student_groups_update" ON public.student_groups;
DROP POLICY IF EXISTS "student_groups_delete" ON public.student_groups;
CREATE POLICY "student_groups_insert" ON public.student_groups FOR INSERT TO authenticated
  WITH CHECK (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = student_groups.group_id AND public.can_access_branch(g.branch_id)));
CREATE POLICY "student_groups_update" ON public.student_groups FOR UPDATE TO authenticated
  USING (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = student_groups.group_id AND public.can_access_branch(g.branch_id)))
  WITH CHECK (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = student_groups.group_id AND public.can_access_branch(g.branch_id)));
CREATE POLICY "student_groups_delete" ON public.student_groups FOR DELETE TO authenticated
  USING (public.is_management() OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = student_groups.group_id AND public.can_access_branch(g.branch_id)));

-- 4) Okullar: öğrenci formunda yeni okul yazılabilir -> tüm personel ekleyebilir
DROP POLICY IF EXISTS "management_insert" ON public.schools;
DROP POLICY IF EXISTS "staff_insert" ON public.schools;
CREATE POLICY "staff_insert" ON public.schools FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- 5) Deneme öğrencileri: şubeye göre okuma/ekleme/güncelleme, silme yalnızca yönetim
DROP POLICY IF EXISTS "management_all" ON public.trial_students;
DROP POLICY IF EXISTS "trial_students_select" ON public.trial_students;
DROP POLICY IF EXISTS "trial_students_insert" ON public.trial_students;
DROP POLICY IF EXISTS "trial_students_update" ON public.trial_students;
DROP POLICY IF EXISTS "management_delete" ON public.trial_students;
CREATE POLICY "trial_students_select" ON public.trial_students FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));
CREATE POLICY "trial_students_insert" ON public.trial_students FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "trial_students_update" ON public.trial_students FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id)) WITH CHECK (public.can_access_branch(branch_id));
CREATE POLICY "management_delete" ON public.trial_students FOR DELETE TO authenticated
  USING (public.is_management());

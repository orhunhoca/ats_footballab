-- =====================================================================
-- Veli portalı: yoklama, performans ve galeri
--  * parent_owns_student(uuid)  : veli yalnızca kendi bağlı çocuğunu görür
--  * get_my_child_attendance / get_my_child_performance / get_my_child_gallery (SECURITY DEFINER)
--  * gallery (ÖZEL depo): yönetim yükler/siler; veli yalnızca çocuğu/grubu için ve
--    "acik_riza_medya_ici" onayı VERMİŞSE imzalı bağlantıyla görür
--  * student-photos (genel depo): yalnız öğrenci profil fotoğrafları (dosya adı tahmin edilemez)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.parent_owns_student(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_parent()
     AND EXISTS (SELECT 1 FROM public.parent_students WHERE parent_user_id = auth.uid() AND student_id = p_student_id);
$$;

-- Velinin en son verdiği iç medya paylaşım onayı
CREATE OR REPLACE FUNCTION public.parent_has_media_consent()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT accepted FROM public.consents
    WHERE user_id = auth.uid() AND document_type = 'acik_riza_medya_ici'
    ORDER BY accepted_at DESC LIMIT 1), false);
$$;

-- Bu dosya yolunu veli görebilir mi? (depo politikası kullanır)
CREATE OR REPLACE FUNCTION public.parent_can_view_media(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_parent() AND public.parent_has_media_consent() AND EXISTS (
    SELECT 1 FROM public.whatsapp_media m
    WHERE m.media_url = p_path AND m.media_type = 'photo'
      AND (
        m.student_id IN (SELECT student_id FROM public.parent_students WHERE parent_user_id = auth.uid())
        OR m.group_id IN (
          SELECT sg.group_id FROM public.student_groups sg
          JOIN public.parent_students ps ON ps.student_id = sg.student_id
          WHERE ps.parent_user_id = auth.uid())
      ));
$$;

CREATE OR REPLACE FUNCTION public.get_my_child_attendance(p_student_id uuid, p_limit integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.parent_owns_student(p_student_id) THEN
    RAISE EXCEPTION 'Bu öğrencinin bilgilerini görüntüleme yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'present', COUNT(*) FILTER (WHERE a.status = 'present'),
    'absent', COUNT(*) FILTER (WHERE a.status = 'absent'),
    'excused', COUNT(*) FILTER (WHERE a.status = 'excused'),
    'total', COUNT(*),
    'records', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', r.attendance_date, 'status', r.status, 'group_name', g.name)
                       ORDER BY r.attendance_date DESC)
      FROM (SELECT * FROM public.attendance WHERE student_id = p_student_id
            ORDER BY attendance_date DESC LIMIT LEAST(GREATEST(p_limit, 1), 200)) r
      LEFT JOIN public.groups g ON g.id = r.group_id), '[]'::jsonb)
  ) INTO result
  FROM public.attendance a WHERE a.student_id = p_student_id;
  RETURN result;
END;
$$;

-- Performans testleri; antrenör notları veliye gönderilmez
CREATE OR REPLACE FUNCTION public.get_my_child_performance(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.parent_owns_student(p_student_id) THEN
    RAISE EXCEPTION 'Bu öğrencinin bilgilerini görüntüleme yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'test_date', t.test_date, 'test_type', t.test_type::text, 'value', t.value, 'unit', t.unit,
      'test_protocol_id', t.test_protocol_id,
      'test_protocols', CASE WHEN p.id IS NULL THEN NULL
                        ELSE jsonb_build_object('name', p.name, 'category', p.category, 'unit', p.unit) END
    ) ORDER BY t.test_date DESC, t.created_at DESC)
    FROM public.performance_tests t
    LEFT JOIN public.test_protocols p ON p.id = t.test_protocol_id
    WHERE t.student_id = p_student_id), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_child_gallery(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE consent boolean;
BEGIN
  IF NOT public.parent_owns_student(p_student_id) THEN
    RAISE EXCEPTION 'Bu öğrencinin bilgilerini görüntüleme yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  consent := public.parent_has_media_consent();
  RETURN jsonb_build_object(
    'consent', consent,
    'items', CASE WHEN NOT consent THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'path', m.media_url, 'caption', m.caption, 'created_at', m.created_at)
                       ORDER BY m.created_at DESC)
      FROM (SELECT * FROM public.whatsapp_media
            WHERE media_type = 'photo'
              AND (student_id = p_student_id
                   OR group_id IN (SELECT group_id FROM public.student_groups WHERE student_id = p_student_id))
            ORDER BY created_at DESC LIMIT 60) m), '[]'::jsonb) END);
END;
$$;

REVOKE ALL ON FUNCTION public.parent_owns_student(uuid), public.parent_has_media_consent(), public.parent_can_view_media(text),
  public.get_my_child_attendance(uuid, integer), public.get_my_child_performance(uuid), public.get_my_child_gallery(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_owns_student(uuid), public.parent_has_media_consent(), public.parent_can_view_media(text),
  public.get_my_child_attendance(uuid, integer), public.get_my_child_performance(uuid), public.get_my_child_gallery(uuid)
  TO authenticated, service_role;

-- ---- Depolar ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gallery', 'gallery', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-photos', 'student-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "gallery_management_all" ON storage.objects;
CREATE POLICY "gallery_management_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'gallery' AND public.is_management())
  WITH CHECK (bucket_id = 'gallery' AND public.is_management());
DROP POLICY IF EXISTS "gallery_parent_select" ON storage.objects;
CREATE POLICY "gallery_parent_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gallery' AND public.parent_can_view_media(name));
DROP POLICY IF EXISTS "student_photos_staff_write" ON storage.objects;
CREATE POLICY "student_photos_staff_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'student-photos' AND public.is_staff())
  WITH CHECK (bucket_id = 'student-photos' AND public.is_staff());

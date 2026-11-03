-- Katılım ve performans raporları. SECURITY INVOKER: RLS geçerli (antrenör yalnızca erişebildiği şubenin verisini görür).
CREATE OR REPLACE FUNCTION public.get_attendance_report(p_from date, p_to date, p_branch uuid DEFAULT NULL, p_group uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Bu rapora erişim yetkiniz yok' USING ERRCODE = '42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN RAISE EXCEPTION 'Geçersiz tarih aralığı'; END IF;

  WITH a AS (
    SELECT at.student_id, at.group_id, at.attendance_date, at.status, s.name AS student_name
    FROM attendance at JOIN students s ON s.id = at.student_id
    WHERE at.attendance_date BETWEEN p_from AND p_to
      AND (p_branch IS NULL OR s.branch_id = p_branch)
      AND (p_group IS NULL OR at.group_id = p_group)
  ), per_student AS (
    SELECT student_id, student_name,
           COUNT(*) FILTER (WHERE status = 'present') AS present,
           COUNT(*) FILTER (WHERE status = 'absent') AS absent,
           COUNT(*) AS total
    FROM a GROUP BY student_id, student_name
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'present', COUNT(*) FILTER (WHERE status = 'present'),
      'absent', COUNT(*) FILTER (WHERE status = 'absent'),
      'excused', COUNT(*) FILTER (WHERE status = 'excused'),
      'total', COUNT(*),
      'sessions', COUNT(DISTINCT (attendance_date, group_id)),
      'students', COUNT(DISTINCT student_id)),
    'by_group', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('group_id', x.group_id, 'name', COALESCE(g.name, 'Grupsuz'),
               'present', x.present, 'absent', x.absent, 'excused', x.excused, 'total', x.total) ORDER BY g.name)
      FROM (SELECT group_id,
                   COUNT(*) FILTER (WHERE status = 'present') AS present,
                   COUNT(*) FILTER (WHERE status = 'absent') AS absent,
                   COUNT(*) FILTER (WHERE status = 'excused') AS excused,
                   COUNT(*) AS total FROM a GROUP BY group_id) x
      LEFT JOIN groups g ON g.id = x.group_id), '[]'::jsonb),
    'by_week', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('week_start', w.week_start, 'present', w.present, 'total', w.total) ORDER BY w.week_start)
      FROM (SELECT date_trunc('week', attendance_date)::date AS week_start,
                   COUNT(*) FILTER (WHERE status = 'present') AS present, COUNT(*) AS total
            FROM a GROUP BY 1) w), '[]'::jsonb),
    'low_attendance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('student_id', l.student_id, 'name', l.student_name,
               'present', l.present, 'absent', l.absent, 'total', l.total) ORDER BY (l.present::numeric / l.total), l.total DESC)
      FROM (SELECT * FROM per_student WHERE total >= 3 AND present::numeric / total < 0.6
            ORDER BY present::numeric / total, total DESC LIMIT 10) l), '[]'::jsonb)
  ) INTO result FROM a;
  RETURN result;
END;
$$;

-- Performans: dönemde yapılan testler (ham satırlar; analiz istemcide mevcut motorla yapılır) + test yapılmayan öğrenciler
CREATE OR REPLACE FUNCTION public.get_performance_report(p_from date, p_to date, p_branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Bu rapora erişim yetkiniz yok' USING ERRCODE = '42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN RAISE EXCEPTION 'Geçersiz tarih aralığı'; END IF;

  SELECT jsonb_build_object(
    'tests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'student_id', t.student_id, 'student_name', s.name, 'test_date', t.test_date,
        'test_type', t.test_type::text, 'value', t.value, 'unit', t.unit, 'test_protocol_id', t.test_protocol_id,
        'test_protocols', CASE WHEN p.id IS NULL THEN NULL
                          ELSE jsonb_build_object('name', p.name, 'category', p.category, 'unit', p.unit) END))
      FROM (SELECT * FROM performance_tests WHERE test_date BETWEEN p_from AND p_to ORDER BY test_date LIMIT 20000) t
      JOIN students s ON s.id = t.student_id AND (p_branch IS NULL OR s.branch_id = p_branch)
      LEFT JOIN test_protocols p ON p.id = t.test_protocol_id), '[]'::jsonb),
    'active_students', (SELECT COUNT(*) FROM students s WHERE s.status = 'Aktif' AND (p_branch IS NULL OR s.branch_id = p_branch)),
    'untested', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('student_id', u.id, 'name', u.name, 'last_test', u.last_test) ORDER BY u.last_test NULLS FIRST, u.name)
      FROM (SELECT s.id, s.name, (SELECT MAX(test_date) FROM performance_tests pt WHERE pt.student_id = s.id) AS last_test
            FROM students s
            WHERE s.status = 'Aktif' AND (p_branch IS NULL OR s.branch_id = p_branch)
              AND NOT EXISTS (SELECT 1 FROM performance_tests pt WHERE pt.student_id = s.id AND pt.test_date BETWEEN p_from AND p_to)
            ORDER BY 3 NULLS FIRST, s.name LIMIT 15) u), '[]'::jsonb),
    'untested_count', (SELECT COUNT(*) FROM students s
            WHERE s.status = 'Aktif' AND (p_branch IS NULL OR s.branch_id = p_branch)
              AND NOT EXISTS (SELECT 1 FROM performance_tests pt WHERE pt.student_id = s.id AND pt.test_date BETWEEN p_from AND p_to))
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_report(date, date, uuid, uuid), public.get_performance_report(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_attendance_report(date, date, uuid, uuid), public.get_performance_report(date, date, uuid) TO authenticated, service_role;

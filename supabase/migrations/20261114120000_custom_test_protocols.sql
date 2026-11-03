-- Hocalar kendi performans testlerini tanımlayabilsin: beceri alanı, ölçüm türü, birim ve "iyi yön" (düşük/yüksek)

-- 1) Beceri alanları ve birimler genişler
alter table public.test_protocols drop constraint if exists test_protocols_category_check;
alter table public.test_protocols add constraint test_protocols_category_check
  check (category = any (array['Hız','Çeviklik','Dayanıklılık','Kuvvet','Esneklik','Denge','Koordinasyon','Teknik']));

alter table public.test_protocols drop constraint if exists test_protocols_unit_check;
alter table public.test_protocols add constraint test_protocols_unit_check
  check (unit = any (array['saniye','dakika','metre','cm','tekrar','kg','puan','%']));

-- 2) Yeni kolonlar
alter table public.test_protocols add column if not exists measure_type text
  check (measure_type is null or measure_type = any (array['time','distance','reps','height','weight','score']));
alter table public.test_protocols add column if not exists direction text
  check (direction is null or direction = any (array['lower','higher']));   -- null: addan/birimden tahmin
alter table public.test_protocols add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;

-- 3) Yetki: personel (antrenör dahil) test ekler; ekleyen ya da yönetim düzenler; silme yalnız admin (arayüz pasife alır)
drop policy if exists admin_insert on public.test_protocols;
drop policy if exists admin_update on public.test_protocols;
drop policy if exists staff_insert on public.test_protocols;
drop policy if exists owner_or_management_update on public.test_protocols;

create policy staff_insert on public.test_protocols for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
create policy owner_or_management_update on public.test_protocols for update to authenticated
  using (public.is_management() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_management() or (public.is_staff() and created_by = auth.uid()));

-- Yönetim dışı kullanıcı sahipliği değiştiremez
create or replace function public.protect_test_protocol_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_management() then
    new.created_by := old.created_by;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_test_protocol_owner on public.test_protocols;
create trigger trg_protect_test_protocol_owner before update on public.test_protocols
  for each row execute function public.protect_test_protocol_owner();

-- 4) Veli portalı ve performans raporu protokol yönünü de taşısın
CREATE OR REPLACE FUNCTION public.get_my_child_performance(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.parent_owns_student(p_student_id) THEN
    RAISE EXCEPTION 'Bu öğrencinin bilgilerini görüntüleme yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'test_date', t.test_date, 'test_type', t.test_type::text, 'value', t.value, 'unit', t.unit,
      'test_protocol_id', t.test_protocol_id,
      'test_protocols', CASE WHEN p.id IS NULL THEN NULL
                        ELSE jsonb_build_object('name', p.name, 'category', p.category, 'unit', p.unit, 'direction', p.direction) END
    ) ORDER BY t.test_date DESC, t.created_at DESC)
    FROM public.performance_tests t
    LEFT JOIN public.test_protocols p ON p.id = t.test_protocol_id
    WHERE t.student_id = p_student_id), '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_performance_report(p_from date, p_to date, p_branch uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
                          ELSE jsonb_build_object('name', p.name, 'category', p.category, 'unit', p.unit, 'direction', p.direction) END))
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
$function$;

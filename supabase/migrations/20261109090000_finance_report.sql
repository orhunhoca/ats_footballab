-- Mali rapor: gerçek tahsilat (payment_history) ve alacak (student_charges / student_balances) verisinden.
-- SECURITY INVOKER: RLS geçerli; ayrıca yalnızca yönetim çağırabilir. Toplamlar SQL'de hesaplanır (satır sınırı sorunu yok).
CREATE OR REPLACE FUNCTION public.get_finance_report(p_from date, p_to date, p_branch uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_management() THEN
    RAISE EXCEPTION 'Bu rapora erişim yetkiniz yok' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'Geçersiz tarih aralığı';
  END IF;

  SELECT jsonb_build_object(
    'collected', jsonb_build_object(
      'total', COALESCE((SELECT SUM(amount) FROM payment_history ph
                         WHERE ph.payment_date BETWEEN p_from AND p_to AND (p_branch IS NULL OR ph.branch_id = p_branch)), 0),
      'count', (SELECT COUNT(*) FROM payment_history ph
                WHERE ph.payment_date BETWEEN p_from AND p_to AND (p_branch IS NULL OR ph.branch_id = p_branch)),
      'by_type', COALESCE((SELECT jsonb_object_agg(t, s) FROM (
                  SELECT ph.payment_type AS t, SUM(amount) AS s FROM payment_history ph
                  WHERE ph.payment_date BETWEEN p_from AND p_to AND (p_branch IS NULL OR ph.branch_id = p_branch)
                  GROUP BY ph.payment_type) x), '{}'::jsonb),
      'by_method', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', m, 'total', s, 'count', c) ORDER BY s DESC) FROM (
                  SELECT ph.payment_method AS m, SUM(amount) AS s, COUNT(*) AS c FROM payment_history ph
                  WHERE ph.payment_date BETWEEN p_from AND p_to AND (p_branch IS NULL OR ph.branch_id = p_branch)
                  GROUP BY ph.payment_method) x), '[]'::jsonb)
    ),
    'due_in_period', COALESCE((SELECT SUM(c.amount) FROM student_charges c
                         WHERE NOT c.is_cancelled AND c.due_date BETWEEN p_from AND p_to
                           AND (p_branch IS NULL OR c.branch_id = p_branch)), 0),
    'receivable', jsonb_build_object(
      'open_total', COALESCE((SELECT SUM(b.balance) FROM student_balances b
                              WHERE b.balance > 0 AND (p_branch IS NULL OR b.branch_id = p_branch)), 0),
      'debtors', (SELECT COUNT(*) FROM student_balances b WHERE b.balance > 0 AND (p_branch IS NULL OR b.branch_id = p_branch)),
      'overdue_total', COALESCE((SELECT SUM(b.overdue_amount) FROM student_balances b
                                 WHERE b.overdue_amount > 0 AND (p_branch IS NULL OR b.branch_id = p_branch)), 0),
      'overdue_students', (SELECT COUNT(*) FROM student_balances b WHERE b.overdue_amount > 0 AND (p_branch IS NULL OR b.branch_id = p_branch)),
      'due_next_30', COALESCE((SELECT SUM(s.remaining_amount) FROM student_charge_status s
                               WHERE s.remaining_amount > 0 AND s.due_date >= CURRENT_DATE AND s.due_date <= CURRENT_DATE + 30
                                 AND (p_branch IS NULL OR s.branch_id = p_branch)), 0)
    ),
    'registrations', jsonb_build_object(
      'new', (SELECT COUNT(*) FROM students st WHERE st.registration_type = 'Yeni Kayıt'
              AND (st.created_at AT TIME ZONE 'Europe/Istanbul')::date BETWEEN p_from AND p_to AND (p_branch IS NULL OR st.branch_id = p_branch)),
      'renewal', (SELECT COUNT(*) FROM students st WHERE st.registration_type IS DISTINCT FROM 'Yeni Kayıt'
              AND (st.created_at AT TIME ZONE 'Europe/Istanbul')::date BETWEEN p_from AND p_to AND (p_branch IS NULL OR st.branch_id = p_branch))
    ),
    'by_branch', CASE WHEN p_branch IS NOT NULL THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('branch_id', k, 'collected', COALESCE(col, 0), 'open', COALESCE(opn, 0), 'overdue', COALESCE(ovd, 0)))
      FROM (
        SELECT keys.k,
          (SELECT SUM(amount) FROM payment_history ph WHERE ph.payment_date BETWEEN p_from AND p_to AND ph.branch_id IS NOT DISTINCT FROM keys.k) AS col,
          (SELECT SUM(b.balance) FROM student_balances b WHERE b.balance > 0 AND b.branch_id IS NOT DISTINCT FROM keys.k) AS opn,
          (SELECT SUM(b.overdue_amount) FROM student_balances b WHERE b.overdue_amount > 0 AND b.branch_id IS NOT DISTINCT FROM keys.k) AS ovd
        FROM (SELECT id AS k FROM branches UNION SELECT NULL::uuid) keys
      ) z WHERE col IS NOT NULL OR opn IS NOT NULL OR ovd IS NOT NULL), '[]'::jsonb) END,
    'top_overdue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('student_id', t.student_id, 'name', t.name, 'overdue_amount', t.overdue_amount, 'oldest_due', t.oldest_due)
                       ORDER BY t.overdue_amount DESC)
      FROM (
        SELECT b.student_id, s.name, b.overdue_amount,
               (SELECT MIN(cs.due_date) FROM student_charge_status cs WHERE cs.student_id = b.student_id AND cs.is_overdue) AS oldest_due
        FROM student_balances b JOIN students s ON s.id = b.student_id
        WHERE b.overdue_amount > 0 AND (p_branch IS NULL OR b.branch_id = p_branch)
        ORDER BY b.overdue_amount DESC LIMIT 10) t), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_finance_report(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finance_report(date, date, uuid) TO authenticated, service_role;

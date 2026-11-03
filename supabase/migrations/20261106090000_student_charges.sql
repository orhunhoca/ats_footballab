-- =====================================================================
-- Borç kalemleri ve bakiye
--   student_charges      : öğrenciye yazılan borçlar (kayıt/aidat, taksit, kıyafet, diğer) + vade tarihi
--   student_charge_status: her borç için ödenen/kalan/gecikme (ödemeler en eski vadeden başlayarak eşlenir)
--   student_balances     : öğrenci başına toplam borç, ödenen, bakiye, geciken tutar, sıradaki vade
--   get_my_child_ledger  : velinin kendi çocuğunun hesap özeti + ödeme yapılacak banka hesapları
-- Ödemeler yalnızca yönetim tarafından girilir (nakit/IBAN/havale/kart); bakiye otomatik düşer.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.student_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  charge_type text NOT NULL DEFAULT 'registration'
    CHECK (charge_type IN ('registration', 'summer_clothing', 'winter_clothing', 'other')),
  description text,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  installment_no integer,
  is_cancelled boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_charges_student_idx ON public.student_charges (student_id, due_date);
CREATE INDEX IF NOT EXISTS student_charges_branch_idx ON public.student_charges (branch_id);

ALTER TABLE public.student_charges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_charges FROM anon;
DROP POLICY IF EXISTS "management_all" ON public.student_charges;
CREATE POLICY "management_all" ON public.student_charges FOR ALL TO authenticated
  USING (public.is_management()) WITH CHECK (public.is_management());

-- Şube, öğrencinin şubesinden atanır; oluşturan kullanıcı kaydedilir
CREATE OR REPLACE FUNCTION public.set_charge_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.branch_id IS NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM public.students WHERE id = NEW.student_id;
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.is_cancelled AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_charge_defaults() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS student_charges_defaults ON public.student_charges;
CREATE TRIGGER student_charges_defaults
  BEFORE INSERT OR UPDATE ON public.student_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_charge_defaults();

-- Her borç için ödenen/kalan: öğrencinin TOPLAM ödemesi, borçlara en eski vadeden başlayarak dağıtılır.
CREATE OR REPLACE VIEW public.student_charge_status WITH (security_invoker = true) AS
WITH paid AS (
  SELECT student_id, COALESCE(SUM(amount), 0) AS total_paid FROM public.payment_history GROUP BY student_id
),
ordered AS (
  SELECT c.*,
         COALESCE(p.total_paid, 0) AS total_paid,
         COALESCE(SUM(c.amount) OVER (
           PARTITION BY c.student_id ORDER BY c.due_date, c.created_at, c.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_before
  FROM public.student_charges c
  LEFT JOIN paid p ON p.student_id = c.student_id
  WHERE NOT c.is_cancelled
)
SELECT id, student_id, branch_id, charge_type, description, amount, due_date, installment_no, created_at,
       GREATEST(0, LEAST(amount, total_paid - cum_before)) AS paid_amount,
       amount - GREATEST(0, LEAST(amount, total_paid - cum_before)) AS remaining_amount,
       (amount - GREATEST(0, LEAST(amount, total_paid - cum_before)) > 0 AND due_date < CURRENT_DATE) AS is_overdue
FROM ordered;

-- Öğrenci başına bakiye (borcu/ödemesi olmayan öğrenci de 0 ile görünür)
CREATE OR REPLACE VIEW public.student_balances WITH (security_invoker = true) AS
SELECT s.id AS student_id,
       s.branch_id,
       COALESCE(ch.total_charged, 0) AS total_charged,
       COALESCE(p.total_paid, 0) AS total_paid,
       COALESCE(ch.total_charged, 0) - COALESCE(p.total_paid, 0) AS balance,
       COALESCE(st.overdue_amount, 0) AS overdue_amount,
       nx.next_due_date,
       nx.next_due_amount
FROM public.students s
LEFT JOIN (SELECT student_id, SUM(amount) AS total_charged FROM public.student_charges
           WHERE NOT is_cancelled GROUP BY student_id) ch ON ch.student_id = s.id
LEFT JOIN (SELECT student_id, SUM(amount) AS total_paid FROM public.payment_history GROUP BY student_id) p ON p.student_id = s.id
LEFT JOIN (SELECT student_id, SUM(remaining_amount) AS overdue_amount FROM public.student_charge_status
           WHERE is_overdue GROUP BY student_id) st ON st.student_id = s.id
LEFT JOIN (SELECT DISTINCT ON (student_id) student_id, due_date AS next_due_date, remaining_amount AS next_due_amount
           FROM public.student_charge_status WHERE remaining_amount > 0
           ORDER BY student_id, due_date, created_at) nx ON nx.student_id = s.id;

GRANT SELECT ON public.student_charge_status, public.student_balances TO authenticated;
REVOKE ALL ON public.student_charge_status, public.student_balances FROM anon;

-- Velinin kendi çocuğunun hesap özeti (yalnızca bağlı olduğu öğrenci) + ödeme yapılabilecek aktif banka hesapları
CREATE OR REPLACE FUNCTION public.get_my_child_ledger(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_branch uuid;
BEGIN
  IF public.current_user_role() <> 'parent'
     OR NOT EXISTS (SELECT 1 FROM public.parent_students WHERE parent_user_id = auth.uid() AND student_id = p_student_id) THEN
    RAISE EXCEPTION 'Bu öğrencinin hesabını görüntüleme yetkiniz yok' USING ERRCODE = '42501';
  END IF;

  SELECT branch_id INTO v_branch FROM public.students WHERE id = p_student_id;

  SELECT jsonb_build_object(
    'total_charged', COALESCE(b.total_charged, 0),
    'total_paid', COALESCE(b.total_paid, 0),
    'balance', COALESCE(b.balance, 0),
    'overdue_amount', COALESCE(b.overdue_amount, 0),
    'next_due_date', b.next_due_date,
    'charges', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'description', COALESCE(c.description, c.charge_type), 'charge_type', c.charge_type,
        'amount', c.amount, 'due_date', c.due_date, 'installment_no', c.installment_no,
        'paid_amount', c.paid_amount, 'remaining_amount', c.remaining_amount, 'is_overdue', c.is_overdue
      ) ORDER BY c.due_date, c.created_at)
      FROM public.student_charge_status c WHERE c.student_id = p_student_id), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'payment_date', ph.payment_date, 'amount', ph.amount, 'payment_method', ph.payment_method
      ) ORDER BY ph.payment_date DESC)
      FROM public.payment_history ph WHERE ph.student_id = p_student_id), '[]'::jsonb),
    'bank_accounts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'bank_name', ba.bank_name, 'account_holder', ba.account_holder, 'iban', ba.iban,
        'description', ba.description
      ) ORDER BY ba.sort_order, ba.created_at)
      FROM public.bank_accounts ba
      WHERE ba.is_active AND (ba.branch_id IS NULL OR ba.branch_id = v_branch)), '[]'::jsonb)
  ) INTO result
  FROM (SELECT 1) x
  LEFT JOIN public.student_balances b ON b.student_id = p_student_id;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_child_ledger(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_child_ledger(uuid) TO authenticated, service_role;

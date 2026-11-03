-- =====================================================================
-- Şirket bilgileri ve banka hesapları
--   company_settings : tek satır (ticari unvan, vergi, adres, KEP, KVKK başvuru e-postası...)
--                      yönetim okur, yalnızca admin yazar
--   get_public_company_info() : KVKK / çerez sayfaları için YALNIZCA kamuya açık alanlar (anon okuyabilir)
--   bank_accounts    : ödeme alınan IBAN'lar (genel veya şubeye özel); yönetim okur, admin yazar
--   payment_history.bank_account_id : havale/EFT ödemesinin hangi hesaba yattığı
-- =====================================================================

-- 1) Şirket bilgileri (tek satır)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
  legal_name text,          -- ticari unvan
  tax_office text,
  tax_number text,
  mersis_no text,
  address text,
  phone text,
  email text,
  kep_address text,
  website text,
  kvkk_contact_email text,  -- KVKK başvuruları için e-posta
  verbis_number text,       -- VERBİS sicil no (yükümlüyse)
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.company_settings (singleton)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_settings FROM anon;
DROP POLICY IF EXISTS "management_select" ON public.company_settings;
DROP POLICY IF EXISTS "admin_insert" ON public.company_settings;
DROP POLICY IF EXISTS "admin_update" ON public.company_settings;
CREATE POLICY "management_select" ON public.company_settings FOR SELECT TO authenticated USING (public.is_management());
CREATE POLICY "admin_insert" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.company_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Kamuya açık (giriş yapmadan görülen) hukuki sayfalar için sınırlı bilgi: vergi bilgileri DAHİL DEĞİL
CREATE OR REPLACE FUNCTION public.get_public_company_info()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
       'legal_name', legal_name,
       'mersis_no', mersis_no,
       'address', address,
       'phone', phone,
       'email', email,
       'kep_address', kep_address,
       'website', website,
       'kvkk_contact_email', kvkk_contact_email,
       'verbis_number', verbis_number
     ) FROM public.company_settings LIMIT 1),
    '{}'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.get_public_company_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_company_info() TO anon, authenticated, service_role;

-- 2) Banka hesapları
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL, -- NULL = tüm şubeler
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  iban text NOT NULL CHECK (iban ~ '^TR[0-9]{24}$'),
  bank_branch text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_iban_unique ON public.bank_accounts (iban);
CREATE INDEX IF NOT EXISTS bank_accounts_branch_id_idx ON public.bank_accounts (branch_id);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bank_accounts FROM anon;
DROP POLICY IF EXISTS "management_select" ON public.bank_accounts;
DROP POLICY IF EXISTS "admin_insert" ON public.bank_accounts;
DROP POLICY IF EXISTS "admin_update" ON public.bank_accounts;
DROP POLICY IF EXISTS "admin_delete" ON public.bank_accounts;
CREATE POLICY "management_select" ON public.bank_accounts FOR SELECT TO authenticated USING (public.is_management());
CREATE POLICY "admin_insert" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update" ON public.bank_accounts FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete" ON public.bank_accounts FOR DELETE TO authenticated USING (public.is_admin());

-- 3) Havale/EFT ödemesinin yattığı hesap
ALTER TABLE public.payment_history
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

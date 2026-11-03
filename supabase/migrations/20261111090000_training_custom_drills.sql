-- Hocaların egzersiz kütüphanesine eklediği çalışmalar.
-- Hazır (yerleşik) egzersizler kodda durur; bu tablo yalnız hocaların eklediklerini tutar.
CREATE TABLE IF NOT EXISTS public.training_custom_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  kind text NOT NULL DEFAULT 'technical' CHECK (kind IN ('warmup', 'technical', 'game', 'cooldown')),
  min_age integer NOT NULL DEFAULT 6 CHECK (min_age BETWEEN 4 AND 18),
  max_age integer NOT NULL DEFAULT 16 CHECK (max_age BETWEEN 4 AND 18),
  suggested_minutes integer CHECK (suggested_minutes IS NULL OR suggested_minutes BETWEEN 1 AND 120),
  players text,
  goal text,
  setup text,
  how text[] NOT NULL DEFAULT '{}',
  points text[] NOT NULL DEFAULT '{}',
  easier text,
  harder text,
  materials text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_age >= min_age)
);
CREATE INDEX IF NOT EXISTS training_custom_drills_kind_idx ON public.training_custom_drills (kind, min_age);

ALTER TABLE public.training_custom_drills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_custom_drills FROM anon;

-- Kütüphaneyi tüm personel (admin, yönetici, antrenör) okur; hepsi ekleyebilir.
-- Değiştirme/silme: ekleyen kişi ya da yönetim.
DROP POLICY IF EXISTS "staff_select" ON public.training_custom_drills;
CREATE POLICY "staff_select" ON public.training_custom_drills FOR SELECT TO authenticated USING (public.is_staff());
DROP POLICY IF EXISTS "staff_insert" ON public.training_custom_drills;
CREATE POLICY "staff_insert" ON public.training_custom_drills FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() AND created_by = auth.uid());
DROP POLICY IF EXISTS "owner_or_management_update" ON public.training_custom_drills;
CREATE POLICY "owner_or_management_update" ON public.training_custom_drills FOR UPDATE TO authenticated
  USING (public.is_staff() AND (created_by = auth.uid() OR public.is_management()))
  WITH CHECK (public.is_staff() AND (created_by = auth.uid() OR public.is_management()));
DROP POLICY IF EXISTS "owner_or_management_delete" ON public.training_custom_drills;
CREATE POLICY "owner_or_management_delete" ON public.training_custom_drills FOR DELETE TO authenticated
  USING (public.is_staff() AND (created_by = auth.uid() OR public.is_management()));

-- Ekleyen kişi ve adı sunucuda atanır (istemiş olsa da başkası adına eklenemez)
CREATE OR REPLACE FUNCTION public.set_custom_drill_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    SELECT COALESCE(NULLIF(full_name, ''), email) INTO NEW.created_by_name FROM public.profiles WHERE id = auth.uid();
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_by_name := OLD.created_by_name;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_custom_drill_defaults() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS training_custom_drills_defaults ON public.training_custom_drills;
CREATE TRIGGER training_custom_drills_defaults
  BEFORE INSERT OR UPDATE ON public.training_custom_drills
  FOR EACH ROW EXECUTE FUNCTION public.set_custom_drill_defaults();

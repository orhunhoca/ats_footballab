-- Antrenör formunda "Uzmanlık" isteğe bağlı; veritabanı da buna uysun.
ALTER TABLE public.coaches ALTER COLUMN specialty DROP NOT NULL;

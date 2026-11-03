-- =====================================================================
-- Şubeler (çok şubeli futbol okulu)
--   * branches tablosu: personel okur, yalnızca admin yazar
--   * students / coaches / groups / trial_students / payment_history -> branch_id
--   * Mevcut tüm kayıtlar varsayılan şubeye ("Merkez Şube") bağlanır
--   * Ödeme kaydı eklenirken şube, öğrencinin şubesinden otomatik atanır
-- Eklemeli bir değişikliktir (kolonlar nullable); eski kod çalışmaya devam eder.
-- =====================================================================

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists branches_name_unique on public.branches (lower(name));

alter table public.branches enable row level security;
revoke all on public.branches from anon;

drop policy if exists "staff_select" on public.branches;
drop policy if exists "admin_insert" on public.branches;
drop policy if exists "admin_update" on public.branches;
drop policy if exists "admin_delete" on public.branches;
create policy "staff_select" on public.branches for select to authenticated using (public.is_staff());
create policy "admin_insert" on public.branches for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.branches for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_delete" on public.branches for delete to authenticated using (public.is_admin());

-- Varsayılan şube (admin sonradan adını değiştirebilir)
insert into public.branches (name)
select 'Merkez Şube' where not exists (select 1 from public.branches);

-- branch_id kolonları (silme kısıtlı: kaydı olan şube silinemez, pasife alınır)
alter table public.students       add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.coaches        add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.groups         add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.trial_students add column if not exists branch_id uuid references public.branches(id) on delete restrict;
alter table public.payment_history add column if not exists branch_id uuid references public.branches(id) on delete restrict;

-- Mevcut kayıtları varsayılan (ilk) şubeye bağla
update public.students        set branch_id = (select id from public.branches order by created_at limit 1) where branch_id is null;
update public.coaches         set branch_id = (select id from public.branches order by created_at limit 1) where branch_id is null;
update public.groups          set branch_id = (select id from public.branches order by created_at limit 1) where branch_id is null;
update public.trial_students  set branch_id = (select id from public.branches order by created_at limit 1) where branch_id is null;

update public.payment_history ph set branch_id = s.branch_id
from public.students s where s.id = ph.student_id and ph.branch_id is null;
update public.payment_history set branch_id = (select id from public.branches order by created_at limit 1) where branch_id is null;

create index if not exists students_branch_id_idx        on public.students (branch_id);
create index if not exists coaches_branch_id_idx         on public.coaches (branch_id);
create index if not exists groups_branch_id_idx          on public.groups (branch_id);
create index if not exists trial_students_branch_id_idx  on public.trial_students (branch_id);
create index if not exists payment_history_branch_id_idx on public.payment_history (branch_id);

-- Ödeme kaydı şubesi: belirtilmediyse öğrencinin şubesinden alınır
create or replace function public.set_payment_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.branch_id is null then
    select branch_id into new.branch_id from public.students where id = new.student_id;
  end if;
  return new;
end;
$$;
revoke all on function public.set_payment_branch() from public, anon, authenticated;

drop trigger if exists payment_history_set_branch on public.payment_history;
create trigger payment_history_set_branch
  before insert on public.payment_history
  for each row execute function public.set_payment_branch();

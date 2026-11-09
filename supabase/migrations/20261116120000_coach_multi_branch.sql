-- Antrenör birden fazla şubede çalışabilir (coach_branches); antrenör kaydı yönetici hesabına da bağlanabilir

create table if not exists public.coach_branches (
  coach_id uuid not null references public.coaches(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, branch_id)
);
create index if not exists coach_branches_branch_idx on public.coach_branches (branch_id);

alter table public.coach_branches enable row level security;
drop policy if exists coach_branches_select on public.coach_branches;
drop policy if exists coach_branches_admin_write on public.coach_branches;
create policy coach_branches_select on public.coach_branches for select to authenticated using (public.is_staff());
create policy coach_branches_admin_write on public.coach_branches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Mevcut ana şubeler çalışma şubesi olarak da kaydedilir
insert into public.coach_branches (coach_id, branch_id)
select id, branch_id from public.coaches where branch_id is not null
on conflict do nothing;

-- Giriş yapan antrenörün çalıştığı tüm şubeler (ana şube + coach_branches)
create or replace function public.current_coach_branch_ids() returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct b), '{}'::uuid[]) from (
    select c.branch_id as b from public.coaches c
      where c.user_id = auth.uid() and coalesce(c.status, 'Aktif') = 'Aktif' and c.branch_id is not null
    union
    select cb.branch_id from public.coach_branches cb join public.coaches c on c.id = cb.coach_id
      where c.user_id = auth.uid() and coalesce(c.status, 'Aktif') = 'Aktif'
  ) t where b is not null
$$;

create or replace function public.can_access_branch(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_management()
      or (public.is_staff() and (
            public.current_coach_branch_access() = 'all'
            or (b is not null and b = any (public.current_coach_branch_ids()))
          ))
$$;

-- Antrenör listesi: ana şubesi ya da çalıştığı şubelerden biri erişilebilirse görünür
drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches for select to authenticated
  using (
    public.can_access_branch(branch_id)
    or exists (select 1 from public.coach_branches cb where cb.coach_id = coaches.id and public.can_access_branch(cb.branch_id))
  );

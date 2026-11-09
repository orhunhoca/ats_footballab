-- Sahalar (şubede birden çok saha), grup kontenjanı, antrenör/saha çakışma denetimi ve deneme öğrencisi kontenjan sınırı

-- 1) Sahalar -----------------------------------------------------------------
create table if not exists public.branch_fields (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  open_time time not null default '09:00',
  close_time time not null default '21:00',
  -- sahanın 1 saatlik azami öğrenci kontenjanı (aynı saatte sahadaki tüm grupların toplamı)
  capacity integer not null check (capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_fields_hours_check check (close_time > open_time),
  constraint branch_fields_unique_name unique (branch_id, name)
);
create index if not exists branch_fields_branch_idx on public.branch_fields (branch_id);

alter table public.branch_fields enable row level security;
drop policy if exists branch_fields_select on public.branch_fields;
drop policy if exists branch_fields_admin_write on public.branch_fields;
create policy branch_fields_select on public.branch_fields for select to authenticated
  using (public.is_management() or (public.is_staff() and public.can_access_branch(branch_id)));
create policy branch_fields_admin_write on public.branch_fields for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Mevcut şubelere varsayılan "Saha 1" (yönetici saat ve kontenjanı gerçeğe göre düzenlemelidir)
insert into public.branch_fields (branch_id, name, open_time, close_time, capacity)
select b.id, 'Saha 1', '08:00', '22:00', 30 from public.branches b
where not exists (select 1 from public.branch_fields f where f.branch_id = b.id);

-- 2) Gruplara saha, kontenjan, yaş aralığı --------------------------------------
alter table public.groups add column if not exists field_id uuid references public.branch_fields(id) on delete restrict;
alter table public.groups add column if not exists capacity integer check (capacity is null or capacity > 0);
alter table public.groups add column if not exists age_min integer check (age_min is null or age_min between 3 and 25);
alter table public.groups add column if not exists age_max integer check (age_max is null or age_max between 3 and 25);
alter table public.groups drop constraint if exists groups_age_range_check;
alter table public.groups add constraint groups_age_range_check check (age_min is null or age_max is null or age_max >= age_min);

update public.groups g set field_id = (
  select f.id from public.branch_fields f where f.branch_id = g.branch_id order by f.created_at limit 1)
where g.field_id is null and g.branch_id is not null;

-- 3) Sayım yardımcıları --------------------------------------------------------
create or replace function public.group_active_students(p_group uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.student_groups sg
  join public.students s on s.id = sg.student_id
  where sg.group_id = p_group and s.status = 'Aktif';
$$;

create or replace function public.group_pending_trials(p_group uuid, p_exclude uuid default null) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.trial_students t
  where t.assigned_group_id = p_group and t.status = 'Beklemede' and t.id is distinct from p_exclude;
$$;

-- Grubun geçerli kontenjanı: grubun kendi kontenjanı, yoksa sahanın kontenjanı; ikisi de yoksa null (sınırsız)
create or replace function public.group_capacity(p_group uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(g.capacity, f.capacity) from public.groups g left join public.branch_fields f on f.id = g.field_id where g.id = p_group;
$$;

grant execute on function public.group_active_students(uuid), public.group_pending_trials(uuid, uuid), public.group_capacity(uuid) to authenticated;

create or replace view public.group_occupancy with (security_invoker = true) as
select g.id as group_id,
       public.group_active_students(g.id) as enrolled,
       public.group_pending_trials(g.id) as trial_pending,
       public.group_capacity(g.id) as capacity
from public.groups g;
grant select on public.group_occupancy to authenticated;

-- 4) Saat / saha / antrenör denetimi --------------------------------------------
create or replace function public.validate_group_session(
  p_group uuid, p_field uuid, p_cap integer, p_coach uuid, p_day integer, p_start time, p_end time
) returns void language plpgsql security definer set search_path = public as $$
declare f record; used integer; other record;
begin
  if p_end <= p_start then raise exception 'Antrenman bitiş saati başlangıçtan sonra olmalı.'; end if;
  select * into f from public.branch_fields where id = p_field;
  if f.id is null then return; end if;
  if p_start < f.open_time or p_end > f.close_time then
    raise exception 'Antrenman saati, % sahasının çalışma saatleri (%–%) dışında.', f.name, to_char(f.open_time, 'HH24:MI'), to_char(f.close_time, 'HH24:MI');
  end if;

  -- Aynı sahada çakışan diğer aktif grupların toplam kontenjanı
  select coalesce(sum(coalesce(g.capacity, f.capacity)), 0) into used
  from public.group_schedule s join public.groups g on g.id = s.group_id
  where g.id <> p_group and g.status = 'Aktif' and g.field_id = p_field
    and s.day_of_week = p_day and s.start_time < p_end and s.end_time > p_start;
  if used + coalesce(p_cap, f.capacity) > f.capacity then
    raise exception 'Bu saatte % sahasında başka gruplar var: toplam kontenjan (%) sahanın 1 saatlik kontenjanını (%) aşıyor.', f.name, used + coalesce(p_cap, f.capacity), f.capacity;
  end if;

  if p_coach is not null then
    select g.name as gname, c.name as cname into other
    from public.group_schedule s join public.groups g on g.id = s.group_id join public.coaches c on c.id = g.coach_id
    where g.id <> p_group and g.status = 'Aktif' and g.coach_id = p_coach
      and s.day_of_week = p_day and s.start_time < p_end and s.end_time > p_start
    limit 1;
    if other.gname is not null then
      raise exception 'Antrenör % bu saatte başka bir grupta (%) görevli.', other.cname, other.gname;
    end if;
  end if;
end $$;

create or replace function public.trg_groups_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record; s record;
begin
  if new.status is distinct from 'Aktif' then return new; end if;
  if tg_op = 'UPDATE'
     and new.coach_id is not distinct from old.coach_id and new.field_id is not distinct from old.field_id
     and new.capacity is not distinct from old.capacity and new.branch_id is not distinct from old.branch_id
     and old.status is not distinct from 'Aktif' then
    return new;
  end if;
  if new.coach_id is null then raise exception 'Antrenman grubu için antrenör seçmelisiniz.'; end if;
  if new.field_id is null then raise exception 'Antrenman grubu için saha seçmelisiniz.'; end if;
  if new.capacity is null then raise exception 'Antrenman grubu için kontenjan girmelisiniz.'; end if;
  select * into f from public.branch_fields where id = new.field_id;
  if f.id is null or f.branch_id is distinct from new.branch_id then raise exception 'Seçilen saha bu şubeye ait değil.'; end if;
  if not f.is_active then raise exception '% sahası pasif durumda.', f.name; end if;
  if new.capacity > f.capacity then
    raise exception 'Grup kontenjanı (%), sahanın 1 saatlik kontenjanını (%) aşamaz.', new.capacity, f.capacity;
  end if;
  if tg_op = 'UPDATE' then
    for s in select * from public.group_schedule where group_id = new.id loop
      perform public.validate_group_session(new.id, new.field_id, new.capacity, new.coach_id, s.day_of_week, s.start_time, s.end_time);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_groups_validate on public.groups;
create trigger trg_groups_validate before insert or update on public.groups
  for each row execute function public.trg_groups_validate();

create or replace function public.trg_group_schedule_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from public.groups where id = new.group_id;
  if g.id is null or g.status is distinct from 'Aktif' or g.field_id is null then return new; end if;
  perform public.validate_group_session(g.id, g.field_id, g.capacity, g.coach_id, new.day_of_week, new.start_time, new.end_time);
  return new;
end $$;
drop trigger if exists trg_group_schedule_validate on public.group_schedule;
create trigger trg_group_schedule_validate before insert or update on public.group_schedule
  for each row execute function public.trg_group_schedule_validate();

-- 5) Kontenjan: deneme öğrencisi (kesin engel) ve öğrenci (yönetim aşabilir) ------
create or replace function public.notify_if_group_full(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cap integer; used integer; gname text; msg text;
begin
  cap := public.group_capacity(p_group);
  if cap is null then return; end if;
  used := public.group_active_students(p_group) + public.group_pending_trials(p_group);
  if used < cap then return; end if;
  select name into gname from public.groups where id = p_group;
  msg := format('%s grubunun kontenjanı doldu (%s/%s). Yeni deneme öğrencisi alınamaz.', gname, used, cap);
  if not exists (select 1 from public.notifications where type = 'capacity_full' and message = msg and is_read = false) then
    insert into public.notifications (type, title, message, scheduled_date) values ('capacity_full', 'Grup kontenjanı doldu', msg, current_date);
  end if;
end $$;

create or replace function public.trg_trial_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap integer; used integer; gname text;
begin
  if new.status is distinct from 'Beklemede' or new.assigned_group_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.assigned_group_id is not distinct from old.assigned_group_id and old.status is not distinct from 'Beklemede' then
    return new; -- yer zaten bu öğrenciye ayrılmış
  end if;
  cap := public.group_capacity(new.assigned_group_id);
  if cap is null then return new; end if;
  used := public.group_active_students(new.assigned_group_id) + public.group_pending_trials(new.assigned_group_id, new.id);
  if used >= cap then
    select name into gname from public.groups where id = new.assigned_group_id;
    raise exception 'KONTENJAN_DOLU: % grubunun kontenjanı dolu (%/%). Yeni deneme öğrencisi alınamaz; başka bir grup/saha seçin ya da kontenjanı artırın.', gname, used, cap;
  end if;
  return new;
end $$;
drop trigger if exists trg_trial_capacity on public.trial_students;
create trigger trg_trial_capacity before insert or update of assigned_group_id, status on public.trial_students
  for each row execute function public.trg_trial_capacity();

create or replace function public.trg_trial_after_full() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_group_id is not null and new.status = 'Beklemede' then perform public.notify_if_group_full(new.assigned_group_id); end if;
  return null;
end $$;
drop trigger if exists trg_trial_after_full on public.trial_students;
create trigger trg_trial_after_full after insert or update of assigned_group_id, status on public.trial_students
  for each row execute function public.trg_trial_after_full();

create or replace function public.trg_student_group_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap integer; used integer; gname text;
begin
  if public.is_management() then return new; end if;  -- yönetim, uyarıyı onaylayarak aşabilir
  cap := public.group_capacity(new.group_id);
  if cap is null then return new; end if;
  used := public.group_active_students(new.group_id) + public.group_pending_trials(new.group_id);
  if used >= cap then
    select name into gname from public.groups where id = new.group_id;
    raise exception 'KONTENJAN_DOLU: % grubunun kontenjanı dolu (%/%). Öğrenci eklemek için yönetime başvurun.', gname, used, cap;
  end if;
  return new;
end $$;
drop trigger if exists trg_student_group_capacity on public.student_groups;
create trigger trg_student_group_capacity before insert on public.student_groups
  for each row execute function public.trg_student_group_capacity();

create or replace function public.trg_student_group_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_if_group_full(new.group_id);
  return null;
end $$;
drop trigger if exists trg_student_group_after on public.student_groups;
create trigger trg_student_group_after after insert on public.student_groups
  for each row execute function public.trg_student_group_after();

-- 6) Bildirim türü: kontenjan dolu uyarısı
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array['renewal_reminder','payment_due','general','capacity_full']));

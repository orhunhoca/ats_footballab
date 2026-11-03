-- Okul normları: aynı yaş (±1) öğrencilerin her testteki SON ölçümünden yüzdelikler (yalnızca özet döner).
-- En az p_min_n öğrenci yoksa o test için satır dönmez; istemci başlangıç referansına düşer.
create or replace function public.get_school_norms(p_age integer, p_min_n integer default 20)
returns table (protocol_id uuid, n integer, p25 numeric, p50 numeric, p75 numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  return query
  with latest as (
    select distinct on (pt.student_id, pt.test_protocol_id)
      pt.test_protocol_id as pid, pt.value
    from public.performance_tests pt
    join public.students s on s.id = pt.student_id
    where pt.test_protocol_id is not null
      and s.age between p_age - 1 and p_age + 1
    order by pt.student_id, pt.test_protocol_id, pt.test_date desc, pt.created_at desc
  )
  select l.pid, count(*)::integer,
         percentile_cont(0.25) within group (order by l.value)::numeric,
         percentile_cont(0.5)  within group (order by l.value)::numeric,
         percentile_cont(0.75) within group (order by l.value)::numeric
  from latest l
  group by l.pid
  having count(*) >= greatest(p_min_n, 5);
end;
$$;

revoke all on function public.get_school_norms(integer, integer) from public, anon;
grant execute on function public.get_school_norms(integer, integer) to authenticated;

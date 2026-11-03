-- Koşu/şut teknik analizi kayıtları (video saklanmaz; yalnız poz göstergeleri ve yazılı analiz)
create table if not exists public.technique_analyses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (kind in ('run','kick')),
  metrics jsonb not null default '[]'::jsonb,
  quality jsonb not null default '{}'::jsonb,
  analysis text not null,
  ai_generated boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists technique_analyses_student_idx on public.technique_analyses (student_id, created_at desc);

alter table public.technique_analyses enable row level security;

-- performance_tests ile aynı kapsam: yönetim hepsi; antrenör erişebildiği şubenin öğrencileri
drop policy if exists technique_analyses_access on public.technique_analyses;
create policy technique_analyses_access on public.technique_analyses for all to authenticated
  using (public.is_management() or (public.is_staff() and exists (
    select 1 from public.students s where s.id = technique_analyses.student_id and public.can_access_branch(s.branch_id))))
  with check (public.is_management() or (public.is_staff() and exists (
    select 1 from public.students s where s.id = technique_analyses.student_id and public.can_access_branch(s.branch_id))));

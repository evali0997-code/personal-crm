-- Personal CRM cloud storage. Run once in Supabase SQL Editor.
-- Each authenticated account can read and write only its own data.
create table if not exists public.crm_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  permanent jsonb not null default '{}'::jsonb,
  daily jsonb not null default '{}'::jsonb,
  work_date date not null default ((now() at time zone 'Asia/Shanghai')::date),
  updated_at timestamptz not null default now()
);
alter table public.crm_state enable row level security;
revoke all on public.crm_state from anon;
grant select, insert, update on public.crm_state to authenticated;
drop policy if exists "crm_select_own" on public.crm_state;
create policy "crm_select_own" on public.crm_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "crm_insert_own" on public.crm_state;
create policy "crm_insert_own" on public.crm_state for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "crm_update_own" on public.crm_state;
create policy "crm_update_own" on public.crm_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Daily records are replaced on date change, not archived.
-- Permanent records: clients, Excel rules/config, name lookup data, fixed tasks.

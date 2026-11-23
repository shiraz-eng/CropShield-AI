create table public.grain_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  details jsonb not null check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 8192),
  unique (id, user_id)
);

create table public.agricultural_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('irrigation','rust','storage')),
  field_id uuid,
  observation_id uuid,
  batch_id uuid,
  recorded_on date not null,
  created_at timestamptz not null default now(),
  details jsonb not null check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 8192),
  foreign key (field_id, user_id) references public.fields(id, user_id) on delete cascade,
  foreign key (observation_id, user_id) references public.crop_observations(id, user_id) on delete cascade,
  foreign key (batch_id, user_id) references public.grain_batches(id, user_id) on delete cascade,
  check (
    (kind = 'irrigation' and field_id is not null and observation_id is null and batch_id is null)
    or (kind = 'rust' and field_id is not null and observation_id is not null and batch_id is null)
    or (kind = 'storage' and field_id is null and observation_id is null and batch_id is not null)
  )
);
create index agricultural_field_history on public.agricultural_records(user_id,field_id,kind,recorded_on desc);
create index agricultural_batch_history on public.agricultural_records(user_id,batch_id,recorded_on desc);
create index grain_batches_owner on public.grain_batches(user_id);

alter table public.grain_batches enable row level security;
alter table public.agricultural_records enable row level security;
revoke all on public.grain_batches, public.agricultural_records from anon, authenticated;
grant select, insert on public.grain_batches, public.agricultural_records to authenticated;
create policy grain_owner_read on public.grain_batches for select to authenticated
  using (user_id = (select auth.uid()));
create policy grain_owner_insert on public.grain_batches for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy agriculture_owner_read on public.agricultural_records for select to authenticated
  using (user_id = (select auth.uid()));
create policy agriculture_owner_insert on public.agricultural_records for insert to authenticated
  with check (user_id = (select auth.uid()) and (
    observation_id is null or exists (
      select 1 from public.crop_observations o
      where o.id = observation_id and o.field_id = agricultural_records.field_id
        and o.user_id = (select auth.uid())
    )
  ));

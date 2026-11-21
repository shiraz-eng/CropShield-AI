-- Additive: persisted Gemini findings per observation, and owner-scoped reminders.

create table public.crop_analyses (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  model_name text not null check (char_length(btrim(model_name)) between 1 and 350),
  analysis_status text not null check (
    analysis_status in ('completed', 'insufficient_image_quality', 'unsupported_crop', 'inconclusive')
  ),
  findings jsonb not null check (jsonb_typeof(findings) = 'object'),
  analyzed_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (observation_id, user_id) references public.crop_observations(id, user_id) on delete cascade
);

create index crop_analyses_observation_recent
  on public.crop_analyses (observation_id, user_id, analyzed_at desc);
create index crop_analyses_owner on public.crop_analyses (user_id);

alter table public.crop_analyses enable row level security;
revoke all on public.crop_analyses from public, anon, authenticated;
grant select, insert on public.crop_analyses to authenticated;

create policy read_own_crop_analyses on public.crop_analyses
  for select to authenticated using (user_id = (select auth.uid()));
create policy insert_own_crop_analyses on public.crop_analyses
  for insert to authenticated with check (user_id = (select auth.uid()));

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 90),
  due_on date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (field_id, user_id) references public.fields(id, user_id) on delete cascade
);

create index reminders_owner_due on public.reminders (user_id, completed, due_on);
create index reminders_field_owner on public.reminders (field_id, user_id);

create trigger reminders_updated_at before update on public.reminders
for each row execute function public.set_crop_updated_at();

alter table public.reminders enable row level security;
revoke all on public.reminders from public, anon, authenticated;
grant select, insert, delete on public.reminders to authenticated;
grant update (title, due_on, completed) on public.reminders to authenticated;

create policy read_own_reminders on public.reminders
  for select to authenticated using (user_id = (select auth.uid()));
create policy insert_own_reminders on public.reminders
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy edit_own_reminders on public.reminders
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy delete_own_reminders on public.reminders
  for delete to authenticated using (user_id = (select auth.uid()));

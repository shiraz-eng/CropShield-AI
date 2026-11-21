create table public.crop_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid,
  earlier_observation_id uuid,
  later_observation_id uuid,
  comparison_mode text not null,
  interval_days integer,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  model_name text not null check (char_length(btrim(model_name)) between 1 and 350),
  created_at timestamptz not null default now(),
  foreign key (field_id, user_id) references public.fields(id, user_id) on delete cascade,
  foreign key (earlier_observation_id, user_id) references public.crop_observations(id, user_id) on delete cascade,
  foreign key (later_observation_id, user_id) references public.crop_observations(id, user_id) on delete cascade,
  check (
    (comparison_mode = 'verified_historical' and field_id is not null
     and earlier_observation_id is not null and later_observation_id is not null
     and earlier_observation_id <> later_observation_id
     and interval_days is not null and interval_days > 0)
    or
    (comparison_mode = 'illustrative_dataset' and field_id is null
     and earlier_observation_id is null and later_observation_id is null and interval_days is null)
  )
);

create index crop_comparisons_owner_field_created
  on public.crop_comparisons(user_id, field_id, created_at desc);
create unique index crop_comparisons_unique_historical_pair
  on public.crop_comparisons(earlier_observation_id, later_observation_id)
  where comparison_mode = 'verified_historical';
create index crop_comparisons_later_observation
  on public.crop_comparisons(later_observation_id, user_id);

alter table public.crop_comparisons enable row level security;
revoke all on public.crop_comparisons from public, anon, authenticated;
grant select, insert on public.crop_comparisons to authenticated;

create policy read_own_crop_comparisons on public.crop_comparisons
  for select to authenticated using (user_id = (select auth.uid()));

create policy insert_own_crop_comparisons on public.crop_comparisons
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (
      comparison_mode = 'illustrative_dataset'
      or exists (
        select 1
        from public.crop_observations earlier
        join public.crop_observations later
          on later.field_id = earlier.field_id and later.user_id = earlier.user_id
        join public.fields field
          on field.id = earlier.field_id and field.user_id = earlier.user_id
        where earlier.id = crop_comparisons.earlier_observation_id
          and later.id = crop_comparisons.later_observation_id
          and earlier.field_id = crop_comparisons.field_id
          and earlier.user_id = crop_comparisons.user_id
          and lower(btrim(field.crop_type)) = 'wheat'
          and later.observed_at - earlier.observed_at = crop_comparisons.interval_days
          and exists (select 1 from public.observation_images where observation_id = earlier.id)
          and exists (select 1 from public.observation_images where observation_id = later.id)
      )
    )
  );

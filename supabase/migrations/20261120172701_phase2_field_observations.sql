create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  preferred_language text not null default 'English' check (preferred_language in ('English', 'Urdu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  crop_type text not null default 'Wheat' check (char_length(btrim(crop_type)) between 1 and 60),
  crop_variety text not null default '' check (char_length(crop_variety) <= 100),
  planting_date date not null,
  area numeric(12, 2) not null check (area > 0),
  area_unit text not null check (area_unit in ('acres', 'hectares')),
  country text not null check (char_length(btrim(country)) between 1 and 100),
  region text not null default '' check (char_length(region) <= 100),
  district text not null default '' check (char_length(district) <= 100),
  latitude numeric check (latitude between -90 and 90),
  longitude numeric check (longitude between -180 and 180),
  notes text not null default '' check (char_length(notes) <= 2000),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check ((latitude is null) = (longitude is null))
);

create table public.crop_observations (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  observed_at date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (field_id, user_id) references public.fields(id, user_id) on delete cascade
);

create table public.observation_images (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  foreign key (observation_id, user_id) references public.crop_observations(id, user_id) on delete cascade,
  check (storage_path ~ ('^' || user_id::text || '/' || observation_id::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png|webp)$'))
);

create index fields_owner_activity on public.fields (user_id, updated_at desc, id);
create index observations_owner_recent on public.crop_observations (user_id, observed_at desc, created_at desc);
create index observations_field_owner on public.crop_observations (field_id, user_id, observed_at desc);
create index images_observation_owner on public.observation_images (observation_id, user_id);
create index images_owner on public.observation_images (user_id);

create function public.set_crop_updated_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_crop_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_crop_updated_at();
create trigger fields_updated_at before update on public.fields
for each row execute function public.set_crop_updated_at();

alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.crop_observations enable row level security;
alter table public.observation_images enable row level security;

revoke all on public.profiles, public.fields, public.crop_observations, public.observation_images from anon, authenticated;
grant select, insert on public.profiles, public.fields, public.crop_observations, public.observation_images to authenticated;
grant update (full_name, preferred_language) on public.profiles to authenticated;
grant update (name, crop_type, crop_variety, planting_date, area, area_unit, country, region, district, latitude, longitude, notes, is_archived) on public.fields to authenticated;

create policy profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_create on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_edit on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy field_read on public.fields for select to authenticated using (user_id = (select auth.uid()));
create policy field_create on public.fields for insert to authenticated with check (user_id = (select auth.uid()));
create policy field_edit on public.fields for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy observation_read on public.crop_observations for select to authenticated using (user_id = (select auth.uid()));
create policy observation_create on public.crop_observations for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.fields f where f.id = field_id and f.user_id = (select auth.uid()) and not f.is_archived
  )
);
create policy image_read on public.observation_images for select to authenticated using (user_id = (select auth.uid()));
create policy image_create on public.observation_images for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.crop_observations o where o.id = observation_id and o.user_id = (select auth.uid())
  ) and exists (
    select 1 from storage.objects obj where obj.bucket_id = 'crop-observations'
      and obj.name = storage_path and obj.owner_id = (select auth.uid())::text
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crop-observations', 'crop-observations', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy crop_photo_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'crop-observations'
  and owner_id = (select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png|webp)$')
);
create policy crop_photo_read on storage.objects for select to authenticated using (
  bucket_id = 'crop-observations' and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy crop_photo_cleanup on storage.objects for delete to authenticated using (
  bucket_id = 'crop-observations' and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (select 1 from public.observation_images i where i.storage_path = name)
);

create function public.save_crop_observation(
  observation uuid, field uuid, captured date, farmer_notes text, images jsonb
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  owner uuid := (select auth.uid());
begin
  if owner is null or coalesce(jsonb_typeof(images), '') <> 'array'
    or jsonb_array_length(images) not between 1 and 3 then
    raise exception 'Invalid observation request' using errcode = '22023';
  end if;
  perform 1 from public.fields where id = field and user_id = owner and not is_archived for share;
  if not found then
    raise exception 'Field unavailable' using errcode = '42501';
  end if;
  insert into public.crop_observations (id, field_id, user_id, observed_at, notes)
  values (observation, field, owner, captured, farmer_notes);
  insert into public.observation_images (observation_id, user_id, storage_path, original_filename, mime_type, file_size)
  select observation, owner, i.storage_path, i.original_filename, i.mime_type, i.file_size
  from jsonb_to_recordset(images) as i(storage_path text, original_filename text, mime_type text, file_size integer);
  return observation;
end;
$$;
revoke all on function public.save_crop_observation(uuid, uuid, date, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_crop_observation(uuid, uuid, date, text, jsonb) to authenticated;

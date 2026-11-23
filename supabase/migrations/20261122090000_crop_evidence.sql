-- Capture measurements are optional for old images and provider outages.
alter table public.observation_images
  add column photo_quality jsonb
  check (photo_quality is null or
    (jsonb_typeof(photo_quality) = 'object' and pg_column_size(photo_quality) <= 8192));

create or replace function public.save_crop_observation(
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
  insert into public.observation_images (observation_id, user_id, storage_path, original_filename, mime_type, file_size, photo_quality)
  select observation, owner, i.storage_path, i.original_filename, i.mime_type, i.file_size, i.photo_quality
  from jsonb_to_recordset(images) as i(storage_path text, original_filename text, mime_type text, file_size integer, photo_quality jsonb);
  return observation;
end;
$$;
revoke all on function public.save_crop_observation(uuid, uuid, date, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_crop_observation(uuid, uuid, date, text, jsonb) to authenticated;

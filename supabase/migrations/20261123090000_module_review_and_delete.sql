-- Farmers can remove their own module records and update the human-review status
-- of a suspected-rust entry without re-running the image review.
alter table public.agricultural_records
  add column review_status text
  check (review_status is null or (kind = 'rust' and review_status in
    ('unreviewed', 'review_requested', 'feedback_received')));

update public.agricultural_records
set review_status = coalesce(details->>'review', 'unreviewed')
where kind = 'rust';

grant update (review_status) on public.agricultural_records to authenticated;
grant delete on public.grain_batches, public.agricultural_records to authenticated;

create policy agriculture_owner_review on public.agricultural_records for update to authenticated
  using (user_id = (select auth.uid()) and kind = 'rust')
  with check (user_id = (select auth.uid()) and kind = 'rust');
create policy agriculture_owner_delete on public.agricultural_records for delete to authenticated
  using (user_id = (select auth.uid()));
create policy grain_owner_delete on public.grain_batches for delete to authenticated
  using (user_id = (select auth.uid()));

import { requireIdentity } from "./supabase/server";
import {
  PHOTO_BUCKET,
  type SavedField,
  type SavedImage,
  type SavedObservation,
} from "./farm-types";
import { isUuid } from "./farm-validation";
import { cache } from "react";
import type { ComparisonFindings, Findings, SavedReminder } from "./ai-types";

const fieldColumns =
  "id,name,crop_type,crop_variety,planting_date,area,area_unit,country,region,district,latitude,longitude,notes,is_archived,updated_at";
const observationColumns =
  "id,field_id,observed_at,notes,observation_images(id,storage_path,original_filename,mime_type,file_size)";
type ObservationRow = Omit<SavedObservation, "images"> & {
  observation_images: (Omit<SavedImage, "url"> & { storage_path: string })[];
};

export const listFields = cache(async (activeOnly = false) => {
  const { client, user } = await requireIdentity();
  let query = client.from("fields").select(fieldColumns).eq("user_id", user.id);
  if (activeOnly) query = query.eq("is_archived", false);
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .returns<SavedField[]>();
  if (error) throw new Error("Could not load your fields.");
  return data;
});

export async function getField(id: string) {
  const { client, user } = await requireIdentity();
  if (!isUuid(id)) return null;
  const { data, error } = await client
    .from("fields")
    .select(fieldColumns)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle<SavedField>();
  if (error) throw new Error("Could not load the field.");
  return data;
}

export async function listObservations(fieldId?: string, limit?: number) {
  const { client, user } = await requireIdentity();
  let query = client
    .from("crop_observations")
    .select(observationColumns)
    .eq("user_id", user.id)
    .order("observed_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (fieldId) query = query.eq("field_id", fieldId);
  if (limit) query = query.limit(limit);
  const { data, error } = await query.returns<ObservationRow[]>();
  if (error) throw new Error("Could not load your observations.");
  const paths = data.flatMap((row) =>
    row.observation_images.map((image) => image.storage_path),
  );
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: signingError } = await client.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 300);
    if (signingError) throw new Error("Could not open the saved photos.");
    for (const item of signed ?? [])
      if (item.path && item.signedUrl && !item.error)
        urls.set(item.path, item.signedUrl);
  }
  return data.map(({ observation_images, ...row }): SavedObservation => ({
    ...row,
    images: observation_images.map(({ storage_path, ...image }) => ({
      ...image,
      url: urls.get(storage_path) ?? null,
    })),
  }));
}

export async function dashboardStats() {
  const { client, user } = await requireIdentity();
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const [fields, observations, active, comparisons, due] = await Promise.all([
    client
      .from("fields")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    client
      .from("crop_observations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    client
      .from("fields")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false),
    client
      .from("crop_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    client
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", false)
      .lte("due_on", soon),
  ]);
  if (fields.error || observations.error || active.error || comparisons.error || due.error)
    throw new Error("Could not load workspace totals.");
  return {
    fields: fields.count ?? 0,
    observations: observations.count ?? 0,
    active: active.count ?? 0,
    comparisons: comparisons.count ?? 0,
    dueReminders: due.count ?? 0,
  };
}

export async function latestAnalysis(observationId: string) {
  const { client, user } = await requireIdentity();
  if (!isUuid(observationId)) return null;
  const { data, error } = await client
    .from("crop_analyses")
    .select("model_name,analyzed_at,findings")
    .eq("user_id", user.id)
    .eq("observation_id", observationId)
    .order("analyzed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ model_name: string; analyzed_at: string; findings: Findings }>();
  if (error) throw new Error("Could not load the saved analysis.");
  return data;
}

export async function analyzedObservationIds() {
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("crop_analyses")
    .select("observation_id")
    .eq("user_id", user.id);
  if (error) throw new Error("Could not load saved analyses.");
  return new Set(data.map(({ observation_id }) => observation_id as string));
}

export type SavedComparison = {
  id: string;
  field_id: string | null;
  comparison_mode: "verified_historical" | "illustrative_dataset";
  interval_days: number | null;
  created_at: string;
  result: ComparisonFindings;
};

export async function listComparisons(limit = 20) {
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("crop_comparisons")
    .select("id,field_id,comparison_mode,interval_days,created_at,result")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<SavedComparison[]>();
  if (error) throw new Error("Could not load saved comparisons.");
  return data;
}

export async function listReminders() {
  const { client, user } = await requireIdentity();
  const { data, error } = await client
    .from("reminders")
    .select("id,field_id,title,due_on,completed")
    .eq("user_id", user.id)
    .order("due_on", { ascending: true })
    .returns<SavedReminder[]>();
  if (error) throw new Error("Could not load reminders.");
  return data;
}

/** Open reminders that are overdue or due within the next seven days. */
export function dueReminderNotices(reminders: SavedReminder[], fields: { id: string; name: string }[]) {
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const fieldName = (id: string) => fields.find((field) => field.id === id)?.name ?? "Field";
  return reminders
    .filter(({ completed, due_on }) => !completed && due_on <= soon)
    .map(({ id, title, due_on, field_id }) => ({ id, title, detail: `${fieldName(field_id)} · due ${due_on}` }));
}

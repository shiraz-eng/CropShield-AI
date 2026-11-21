"use server";

import { revalidatePath } from "next/cache";
import { identity } from "./supabase/server";
import {
  MAX_PHOTOS,
  PHOTO_BUCKET,
  photoExtensions,
  type FarmFeedback,
} from "./farm-types";
import { formText, isDate, isUuid, verifyPhoto } from "./farm-validation";
import sharp from "sharp";

const sessionError = { error: "Your session expired. Sign in and try again." };

export async function saveField(
  id: string | null,
  _: FarmFeedback,
  form: FormData,
): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  const read = (key: string) => formText(form, key);
  const lat = read("latitude");
  const lon = read("longitude");
  const field = {
    name: read("name"),
    crop_type: read("crop_type"),
    crop_variety: read("crop_variety"),
    planting_date: read("planting_date"),
    area: Number(read("area")),
    area_unit: read("area_unit"),
    country: read("country"),
    region: read("region"),
    district: read("district"),
    latitude: lat ? Number(lat) : null,
    longitude: lon ? Number(lon) : null,
    notes: read("notes"),
  };
  if (
    !field.name ||
    !field.crop_type ||
    !field.country ||
    !isDate(field.planting_date) ||
    !Number.isFinite(field.area) ||
    field.area <= 0 ||
    field.area > 1000000000 ||
    !["acres", "hectares"].includes(field.area_unit) ||
    !!lat !== !!lon ||
    (lat &&
      (!Number.isFinite(field.latitude) || Math.abs(field.latitude!) > 90)) ||
    (lon &&
      (!Number.isFinite(field.longitude) ||
        Math.abs(field.longitude!) > 180)) ||
    field.notes.length > 2000 ||
    [
      field.name,
      field.country,
      field.region,
      field.district,
      field.crop_variety,
    ].some((value) => value.length > 100) ||
    field.crop_type.length > 60 ||
    (id && !isUuid(id))
  )
    return {
      error: "Check the required field details, dates, area, and coordinates.",
    };

  const { client, user } = auth;
  const query = id
    ? client.from("fields").update(field).eq("id", id).eq("user_id", user.id)
    : client.from("fields").insert({ ...field, user_id: user.id });
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data)
    return {
      error:
        "Could not save the field. Check your connection and field access.",
    };
  revalidatePath("/fields");
  revalidatePath("/fields/" + data.id);
  revalidatePath("/dashboard");
  return { message: "Field saved.", id: data.id };
}

export async function archiveField(
  id: string,
  archived: boolean,
): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  if (!isUuid(id)) return { error: "This field is unavailable." };
  const { data, error } = await auth.client
    .from("fields")
    .update({ is_archived: archived })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error: "Could not update this field. Check your connection and access.",
    };
  revalidatePath("/fields");
  revalidatePath("/fields/" + id);
  revalidatePath("/dashboard");
  return { message: archived ? "Field archived." : "Field restored." };
}

export async function saveObservation(
  _: FarmFeedback,
  form: FormData,
): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  const { client, user } = auth;
  const fieldId = formText(form, "field");
  const observation = formText(form, "request");
  const captured = formText(form, "date");
  const farmerNotes = formText(form, "notes");
  const files = form.getAll("photos");
  if (
    !isUuid(fieldId) ||
    !isUuid(observation) ||
    !isDate(captured) ||
    farmerNotes.length > 2000 ||
    files.length < 1 ||
    files.length > MAX_PHOTOS ||
    !files.every((file): file is File => file instanceof File)
  ) {
    return {
      error:
        "Choose a field, a valid observation date, and one to three photos.",
    };
  }
  const field = await client
    .from("fields")
    .select("id,is_archived")
    .eq("id", fieldId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (field.error || !field.data || field.data.is_archived)
    return {
      error: "This field is unavailable or archived. Choose an active field.",
    };
  const findExisting = () =>
    client
      .from("crop_observations")
      .select("id,field_id")
      .eq("id", observation)
      .eq("user_id", user.id)
      .maybeSingle();
  const feedback = {
    message:
      "Photos saved privately. Open Crop Doctor to analyze this observation.",
    id: observation,
  };
  const existing = await findExisting();
  if (existing.error)
    return { error: "Could not check the existing submission. Try again." };
  if (existing.data)
    return existing.data.field_id === fieldId
      ? feedback
      : { error: "This submission belongs to a different field." };

  for (const file of files) {
    const error = await verifyPhoto(file);
    if (error) return { error: `${file.name}: ${error}` };
    try {
      await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 32_000_000,
        failOn: "warning",
      })
        .resize(1, 1)
        .toBuffer();
    } catch {
      return {
        error: `${file.name}: Choose a readable image with no more than 32 megapixels.`,
      };
    }
  }
  const bucket = client.storage.from(PHOTO_BUCKET);
  const images = [];
  try {
    for (const file of files) {
      const storage_path = `${user.id}/${observation}/${crypto.randomUUID()}.${photoExtensions[file.type as keyof typeof photoExtensions]}`;
      images.push({
        storage_path,
        original_filename: file.name.slice(0, 255) || "crop-photo",
        mime_type: file.type,
        file_size: file.size,
      });
      const { error } = await bucket.upload(storage_path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "0",
      });
      if (error) throw error;
    }
    const { error } = await client.rpc("save_crop_observation", {
      observation,
      field: fieldId,
      captured,
      farmer_notes: farmerNotes,
      images,
    });
    if (error) throw error;
  } catch {
    // Storage RLS only permits deleting paths that have no persisted references.
    const { error: cleanupError } = await bucket.remove(
      images.map((image) => image.storage_path),
    );
    const saved = await findExisting();
    if (saved.data?.field_id === fieldId) {
      revalidatePath("/fields/" + fieldId);
      revalidatePath("/dashboard");
      return feedback;
    }
    if (cleanupError)
      console.error("Crop photo cleanup failed for an incomplete upload.");
    return {
      error: cleanupError
        ? "The save could not be confirmed and upload cleanup could not be verified. Retry this submission."
        : "Could not save the observation. Check your connection and try again.",
    };
  }
  revalidatePath("/fields/" + fieldId);
  revalidatePath("/dashboard");
  return feedback;
}

export async function saveProfile(
  name: string,
  language: string,
): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  name = name.trim();
  if (!name || name.length > 100 || !["English", "Urdu"].includes(language))
    return { error: "Enter a name and a supported language." };
  const table = auth.client.from("profiles");
  const { data: existing, error: readError } = await table
    .select("id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (readError) return { error: "Could not load the profile." };
  const record = { full_name: name, preferred_language: language };
  const { error } = await (existing
    ? table.update(record).eq("id", auth.user.id)
    : table.insert({ id: auth.user.id, ...record }));
  if (error) return { error: "Could not save your profile. Try again." };
  return { message: "Profile saved." };
}

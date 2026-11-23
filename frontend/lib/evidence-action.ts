"use server";

import { callBackend } from "./backend";
import type { PhotoQuality, Readiness } from "./evidence-types";
import { listObservations } from "./farm-data";
import { isUuid, validatePhoto } from "./farm-validation";

export async function checkPhotoQuality(form: FormData): Promise<{ data?: PhotoQuality; error?: string }> {
  const photo = form.get("photo");
  if (!(photo instanceof File)) return { error: "Choose a photo to check." };
  const error = validatePhoto(photo);
  if (error) return { error };
  return callBackend<PhotoQuality>("/photo-quality", {
    method: "POST", body: photo, headers: { "Content-Type": photo.type },
  });
}

export async function loadCaptureReferences(fieldId: string) {
  if (!isUuid(fieldId)) return [];
  const observations = await listObservations(fieldId, 10);
  return observations.flatMap(({ observed_at, images }) =>
    images.flatMap(({ id, url, original_filename }) => url
      ? [{ id, url, date: observed_at, name: original_filename }]
      : []),
  );
}

export async function checkComparisonReadiness(first?: string, second?: string): Promise<{ data?: Readiness; error?: string }> {
  if (first === undefined && second === undefined)
    return callBackend<Readiness>("/comparisons/illustrative/readiness", { method: "POST" });
  if (!first || !second || !isUuid(first) || !isUuid(second) || first === second)
    return { error: "Choose two distinct saved observations." };
  return callBackend<Readiness>("/comparisons/readiness", {
    method: "POST",
    body: JSON.stringify({ first_observation_id: first, second_observation_id: second }),
  });
}

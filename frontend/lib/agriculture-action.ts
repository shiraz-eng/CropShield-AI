"use server";

import { revalidatePath } from "next/cache";
import { callBackend } from "./backend";

const routes = { irrigation: "/aquaguard", rust: "/rustwatch", batches: "/grainsafe", storage: "/grainsafe" };
const numbers = new Set(["moisture_pct", "temperature_c", "humidity_pct", "quantity",
  "moisture_limit_pct", "temperature_limit_c", "humidity_limit_pct"]);

type Feedback = { error?: string; saved?: boolean };

export async function saveAgriculture(kind: keyof typeof routes, _: Feedback, form: FormData): Promise<Feedback> {
  if (!Object.hasOwn(routes, kind)) return { error: "Unknown record type." };
  const values = Object.fromEntries([...form.entries()].flatMap(([key, value]) => {
    if (typeof value !== "string" || !value.trim() || key.startsWith("$ACTION")) return [];
    return [[key, numbers.has(key) ? Number(value) : key === "irrigated" ? value === "yes" : value]];
  }));
  if (Object.values(values).some((value) => typeof value === "number" && !Number.isFinite(value)))
    return { error: "Enter a valid number." };
  const result = await callBackend<{ saved: boolean }>("/agriculture/" + kind, {
    method: "POST", body: JSON.stringify(values),
  });
  if (!result.data?.saved) return { error: result.error ?? "Could not save the record." };
  revalidatePath(routes[kind]);
  revalidatePath("/", "layout");
  return { saved: true };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reviews = new Set(["unreviewed", "review_requested", "feedback_received"]);

/** Update the farmer-recorded review status of a suspected-rust entry. */
export async function setRustReview(id: string, review: string): Promise<Feedback> {
  if (!uuid.test(id) || !reviews.has(review)) return { error: "Choose a valid review status." };
  const result = await callBackend<{ saved: boolean }>(`/agriculture/rust/${id}`, {
    method: "PATCH", body: JSON.stringify({ review }),
  });
  if (!result.data?.saved) return { error: result.error ?? "Could not update the review status." };
  revalidatePath("/rustwatch");
  return { saved: true };
}

/** Delete one module record, or a storage batch together with its inspections. */
export async function deleteAgriculture(target: "records" | "batches", id: string): Promise<Feedback> {
  if (!["records", "batches"].includes(target) || !uuid.test(id)) return { error: "Unknown record." };
  const result = await callBackend<{ deleted: boolean }>(`/agriculture/${target}/${id}`, { method: "DELETE" });
  if (!result.data?.deleted) return { error: result.error ?? "Could not delete the record." };
  for (const path of new Set(Object.values(routes))) revalidatePath(path);
  revalidatePath("/", "layout");
  return { saved: true };
}

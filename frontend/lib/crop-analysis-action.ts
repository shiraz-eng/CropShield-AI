"use server";

import { revalidatePath } from "next/cache";
import { backendError, backendResponse, callBackend } from "./backend";
import { isUuid } from "./farm-validation";
import type { AssistantAnswer, ComparisonFindings, Findings } from "./ai-types";

export type AnalysisFeedback = { findings?: Findings; analyzedAt?: string; error?: string };

export async function analyzeSavedObservation(id: string): Promise<AnalysisFeedback> {
  if (!isUuid(id)) return { error: "Observation unavailable." };
  const result = await callBackend<{ findings: Findings; analyzed_at: string }>(
    `/observations/${id}/analysis`,
    { method: "POST" },
  );
  if (result.error || !result.data) return { error: result.error };
  revalidatePath("/crop-doctor");
  revalidatePath("/reports");
  return { findings: result.data.findings, analyzedAt: result.data.analyzed_at };
}

export type ComparisonFeedback = { result?: ComparisonFindings; error?: string };

export async function compareObservations(
  _: ComparisonFeedback,
  form: FormData,
): Promise<ComparisonFeedback> {
  const first = String(form.get("first") ?? "");
  const second = String(form.get("second") ?? "");
  if (!isUuid(first) || !isUuid(second) || first === second)
    return { error: "Choose two different saved observations from the same field." };
  const result = await callBackend<ComparisonFindings>("/comparisons", {
    method: "POST",
    body: JSON.stringify({ first_observation_id: first, second_observation_id: second }),
  });
  if (result.data) {
    revalidatePath("/comparison");
    revalidatePath("/reports");
  }
  return { result: result.data, error: result.error };
}

export async function compareSamples(): Promise<ComparisonFeedback> {
  const result = await callBackend<ComparisonFindings>("/comparisons/illustrative", { method: "POST" });
  if (result.data) revalidatePath("/reports");
  return { result: result.data, error: result.error };
}

export type AssistantFeedback = {
  reply?: AssistantAnswer;
  question?: string;
  error?: string;
  fieldUnavailable?: boolean;
};

export async function askAssistant(
  _: AssistantFeedback,
  form: FormData,
): Promise<AssistantFeedback> {
  const fieldId = String(form.get("field") ?? "");
  const question = String(form.get("question") ?? "").trim();
  const language = form.get("language") === "Urdu" ? "Urdu" : "English";
  if (fieldId && !isUuid(fieldId)) return { error: "Choose an active field or use general chat." };
  if (!question || question.length > 1200)
    return { error: "Ask a question of up to 1,200 characters." };
  let history: unknown;
  try {
    history = JSON.parse(String(form.get("history") ?? "[]"));
    if (!Array.isArray(history) || history.length > 6) throw new Error();
  } catch {
    return { error: "Start a new chat and try again." };
  }
  const response = await backendResponse("/assistant", {
    method: "POST",
    body: JSON.stringify({ field_id: fieldId || null, question, language, history }),
  }, { retryConnection: true });
  if (!(response instanceof Response)) return response;
  if (response.status === 404) {
    revalidatePath("/assistant");
    return {
      fieldUnavailable: true,
      error: "This field is unavailable. Choose another field or continue in general chat.",
    };
  }
  if (!response.ok) return { error: await backendError(response) };
  return { reply: (await response.json()) as AssistantAnswer, question };
}

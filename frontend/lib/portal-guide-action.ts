"use server";

import { backendResponse } from "./backend";
import { guideTopic, localGuide, type GuideLanguage } from "./portal-guide";
import { identity } from "./supabase/server";

type GuideReply = { topics: string[]; answer?: string; status?: "unavailable" | "unsupported" | "auth" | "invalid" };

export async function askPortalGuide(
  question: string,
  language: GuideLanguage,
  page: string | null,
  previousTopic: string | null,
): Promise<GuideReply> {
  if (!(await identity())) return { topics: [], status: "auth" };
  if (typeof question !== "string" || !question.trim() || question.length > 600 || !["en", "ur"].includes(language))
    return { topics: [], status: "invalid" };
  const direct = localGuide(question);
  if (direct) return { topics: [...direct] };

  const response = await backendResponse("/portal-guide", {
    method: "POST",
    body: JSON.stringify({
      question: question.trim(),
      language,
      page: guideTopic(page)?.id ?? null,
      previous_topic: guideTopic(previousTopic)?.id ?? null,
    }),
  }, { retryConnection: true });
  if (!(response instanceof Response) || !response.ok)
    return { topics: [], status: "unavailable" };

  try {
    const { answer, topics } = await response.json() as { answer: string; topics: string[] };
    if (!Array.isArray(topics) || topics.length > 2 || topics.some((id) => !guideTopic(id)))
      return { topics: [], status: "unavailable" };
    if (!topics.length) return { topics: [], status: "unsupported" };
    return { topics: [...new Set(topics)], answer: typeof answer === "string" ? answer.slice(0, 900) : undefined };
  } catch {
    return { topics: [], status: "unavailable" };
  }
}

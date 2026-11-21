import { identity } from "./supabase/server";

// Server-only helpers for calling FastAPI with the signed-in user's Supabase token,
// so Row Level Security applies end to end. Do not re-export these from a
// "use server" module: that would expose arbitrary backend paths to the browser.

const statusErrors: Record<number, string> = {
  401: "Your session expired. Sign in and try again.",
  404: "That record is unavailable.",
  429: "The AI service is busy. Try again in a minute.",
  504: "The AI service timed out. Try again.",
};

export async function backendResponse(
  path: string,
  init: RequestInit = {},
): Promise<Response | { error: string }> {
  const auth = await identity();
  if (!auth) return { error: statusErrors[401] };
  const { data } = await auth.client.auth.getSession();
  if (!data.session) return { error: statusErrors[401] };
  const origin = process.env.CROP_ANALYSIS_API_URL || "http://127.0.0.1:8000";
  try {
    return await fetch(new URL(path, origin), {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${data.session.access_token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return { error: "Could not reach the CropShield API. Check that FastAPI is running." };
  }
}

export async function backendError(response: Response) {
  let detail = "";
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
  } catch {}
  return statusErrors[response.status] ?? (detail || "The AI service is unavailable. Try again later.");
}

export async function callBackend<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data?: T; error?: string }> {
  const response = await backendResponse(path, init);
  if (!(response instanceof Response)) return response;
  if (response.ok) return { data: (await response.json()) as T };
  return { error: await backendError(response) };
}

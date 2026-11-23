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
  { retryConnection = false }: { retryConnection?: boolean } = {},
): Promise<Response | { error: string }> {
  const auth = await identity();
  if (!auth) return { error: statusErrors[401] };
  const { data } = await auth.client.auth.getSession();
  if (!data.session) return { error: statusErrors[401] };
  const origin = process.env.CROP_ANALYSIS_API_URL || "http://127.0.0.1:8000";
  const signal = init.signal ?? AbortSignal.timeout(90_000);
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const request = {
    ...init,
    headers,
    cache: "no-store" as const,
    signal,
  };
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(new URL(path, origin), request);
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
        return { error: "The CropShield service took too long to respond. Try again." };
      }
      if (retryConnection && attempt === 0 && error instanceof TypeError && Date.now() - started < 5_000) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      console.warn("CropShield backend connection failed");
      return { error: "The CropShield service could not be reached. Try again shortly." };
    }
  }
}

export async function backendError(response: Response) {
  let detail = "";
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
    // FastAPI validation errors arrive as a list; show the first rule the input broke.
    else if (response.status === 422 && Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: unknown } | undefined;
      if (typeof first?.msg === "string") detail = first.msg.replace(/^Value error, /, "");
      else detail = "Check the entered values and try again.";
    }
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

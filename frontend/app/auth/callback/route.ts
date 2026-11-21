import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/profile";

function finish(path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  const client = await serverClient();
  if (client && token && (type === "email" || type === "recovery")) {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: token,
      type,
    });
    if (!error) {
      if (data.user && type === "email") await ensureProfile(client, data.user);
      return finish(type === "recovery" ? "/reset-password" : "/dashboard");
    }
  } else if (client && code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) await ensureProfile(client, data.user);
      return finish(
        params.get("flow") === "recovery" ? "/reset-password" : "/dashboard",
      );
    }
  }
  return finish("/login?link=expired");
}

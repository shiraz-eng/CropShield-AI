import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseConfig } from "./config";

export const serverClient = cache(async () => {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values)
            cookieStore.set(name, value, options);
        } catch {
          // Server Components are read-only. The proxy refreshes session cookies.
        }
      },
    },
  });
});

export const identity = cache(async () => {
  const client = await serverClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : { client, user: data.user };
});

export async function requireIdentity() {
  const auth = await identity();
  if (!auth) redirect("/login");
  return auth;
}

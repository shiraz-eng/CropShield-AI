export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key?.startsWith("sb_publishable_")) return null;
  try {
    const parsed = new URL(url);
    const local = ["127.0.0.1", "localhost"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" &&
        !(local && parsed.protocol === "http:")) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

export function appOrigin() {
  const value = process.env.APP_ORIGIN ?? "http://localhost:3000";
  const parsed = new URL(value);
  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    (parsed.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(parsed.hostname))
  ) {
    throw new Error(
      "APP_ORIGIN must be an HTTPS origin or a local development URL.",
    );
  }
  return parsed.origin;
}

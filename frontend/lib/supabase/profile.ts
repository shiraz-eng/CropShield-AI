import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function ensureProfile(client: SupabaseClient, user: User) {
  const supplied = user.user_metadata.full_name;
  const full_name =
    (typeof supplied === "string" && supplied.trim().slice(0, 100)) ||
    user.email?.split("@")[0].slice(0, 100) ||
    "Farmer";
  const { error } = await client
    .from("profiles")
    .upsert(
      { id: user.id, full_name },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) console.warn("Could not initialize the CropShield profile.");
}

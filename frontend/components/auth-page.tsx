import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { identity } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import type { AuthMode } from "@/lib/auth-actions";

export async function AuthPage({
  mode,
  notice,
}: {
  mode: AuthMode;
  notice?: string;
}) {
  const auth = await identity();
  if (auth && (mode === "login" || mode === "signup")) redirect("/dashboard");
  if (!auth && mode === "reset") redirect("/forgot-password");
  return (
    <AuthForm
      mode={mode}
      configured={!!supabaseConfig()}
      notice={notice}
      demoPassword={mode === "login" ? process.env.PUBLIC_DEMO_PASSWORD : undefined}
    />
  );
}

"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "./supabase/config";
import { identity, serverClient } from "./supabase/server";
import { ensureProfile } from "./supabase/profile";

export type AuthMode = "login" | "signup" | "forgot" | "reset";
export type AuthFeedback = { error?: string; message?: string };

export async function authAction(
  mode: AuthMode,
  _: AuthFeedback,
  form: FormData,
): Promise<AuthFeedback> {
  const client = await serverClient();
  if (!client)
    return {
      error:
        "Supabase is not configured. Follow the README setup instructions.",
    };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (
    mode !== "reset" &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    return { error: "Enter a valid email address." };
  if (
    mode !== "forgot" &&
    (!password ||
      password.length > 128 ||
      (mode !== "login" && password.length < 8))
  )
    return {
      error: "Enter a password. New passwords require 8–128 characters.",
    };
  if (mode === "login") {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error?.code === "email_not_confirmed")
      return { error: "Confirm your email using the link sent to your inbox." };
    if (error)
      return {
        error:
          error.code === "invalid_credentials"
            ? "The email or password is incorrect."
            : "Sign-in is unavailable. Try again shortly.",
      };
    if (data.user) await ensureProfile(client, data.user);
    redirect("/dashboard");
  }
  if (mode === "signup") {
    const name = String(form.get("name") ?? "").trim();
    if (!name || name.length > 100)
      return { error: "Enter a name up to 100 characters." };
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: appOrigin() + "/auth/callback",
        data: { full_name: name },
      },
    });
    if (error)
      return {
        error:
          error.code === "weak_password"
            ? "Choose a stronger password."
            : "Could not register. Check the details and try again shortly.",
      };
    if (data.session) {
      if (data.user) await ensureProfile(client, data.user);
      redirect("/dashboard");
    }
    return { message: "Check your inbox for a confirmation link." };
  }
  if (mode === "forgot") {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: appOrigin() + "/auth/callback?flow=recovery",
    });
    if (error && error.code !== "user_not_found")
      return {
        error: "The reset request could not be sent. Try again shortly.",
      };
    return {
      message:
        "If this email has an account, a reset link will arrive shortly.",
    };
  }
  if (!(await identity()))
    return { error: "Your reset session expired. Request a new link." };
  const { error } = await client.auth.updateUser({ password });
  if (error)
    return {
      error:
        "Could not set that password. Choose a different password or request a new link.",
    };
  await client.auth.signOut({ scope: "local" });
  redirect("/login?password=updated");
}

export async function logout() {
  const client = await serverClient();
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error && error.name !== "AuthSessionMissingError")
      redirect("/settings?logout=failed");
  }
  redirect("/login");
}

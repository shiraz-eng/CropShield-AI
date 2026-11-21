"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Wheat } from "lucide-react";
import { authAction, type AuthMode } from "@/lib/auth-actions";
import { CropPhoto } from "./shared";

const copy = {
  login: [
    "Welcome back",
    "Sign in to manage your fields and observations.",
    "Sign in",
  ],
  signup: [
    "Create your account",
    "Start building your field history.",
    "Create account",
  ],
  forgot: [
    "Reset your password",
    "Request a secure link to update your password.",
    "Send reset link",
  ],
  reset: [
    "Choose a new password",
    "Choose a password for your CropShield AI account.",
    "Update password",
  ],
};

export function AuthForm({
  mode,
  configured,
  notice,
}: {
  mode: AuthMode;
  configured: boolean;
  notice?: string;
}) {
  const [state, submit, pending] = useActionState(
    authAction.bind(null, mode),
    {},
  );
  const [visible, setVisible] = useState(false);
  const [title, description, label] = copy[mode];
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <CropPhoto src="/crops/golden.jpg" className="hero-photo" alt="" />
        <span className="brand">
          <span className="brand-mark">
            <Wheat size={24} />
          </span>
          <strong>CropShield AI</strong>
        </span>
        <h2>See how your fields change.</h2>
      </section>
      <section className="auth-content">
        <div className="card panel stack auth-card">
          <h1>{title}</h1>
          <p>{description}</p>
          {!configured && (
            <p className="message-caution" role="alert">
              Supabase setup is required. Configure the public URL and
              publishable key in frontend/.env.local.
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {mode === "login" && configured && (
            <p className="insight">
              <strong>Demo email</strong> cropshield-demo@example.com
              <br />
              Use the demo password shared with you.
            </p>
          )}
          <form action={submit} className="stack">
            {mode === "signup" && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <div className="password-entry">
                <label>
                  Password
                  <input
                    name="password"
                    type={visible ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? undefined : 8}
                    maxLength={128}
                    required
                  />
                </label>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            )}
            <button className="button" disabled={pending || !configured}>
              {pending ? "Please wait…" : label}
            </button>
            {state.error && (
              <p role="alert" className="message-error">
                {state.error}
              </p>
            )}
            {state.message && (
              <p role="status" className="insight">
                {state.message}
              </p>
            )}
          </form>
          <div className="actions">
            {mode === "login" ? (
              <>
                <Link className="text-link" href="/signup">
                  Create an account
                </Link>
                <Link className="text-link" href="/forgot-password">
                  Forgot password?
                </Link>
              </>
            ) : (
              <Link className="text-link" href="/login">
                Back to sign in
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

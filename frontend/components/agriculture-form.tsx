"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Droplets, ShieldCheck, Warehouse } from "lucide-react";
import { deleteAgriculture, saveAgriculture, setRustReview } from "@/lib/agriculture-action";
import { PageHeader } from "./shared";

const icons = { irrigation: Droplets, rust: ShieldCheck, storage: Warehouse };

export function AgricultureHeader({ kind, title, description }: {
  kind: keyof typeof icons; title: string; description: string;
}) {
  return <PageHeader title={title} description={description} icon={icons[kind]} />;
}

export function AgricultureForm({ kind, children }: {
  kind: "irrigation" | "rust" | "batches" | "storage"; children: ReactNode;
}) {
  const [state, action, pending] = useActionState(saveAgriculture.bind(null, kind), {});
  const form = useRef<HTMLFormElement>(null);
  // Once hydrated, submit inside a transition so React keeps the farmer's entries when
  // validation fails, and clear them only after a successful save. The action prop stays
  // as the pre-hydration fallback: a server-action POST, never a GET with values in the URL.
  useEffect(() => { if (state.saved) form.current?.reset(); }, [state]);
  return <form ref={form} action={action} className="card panel stack" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }}>
    <fieldset disabled={pending} className="stack">{children}</fieldset>
    <button className="button" disabled={pending}>{pending ? "Saving…" : "Save record"}</button>
    {state.error && <p role="alert" className="message-error">{state.error}</p>}
    {state.saved && <p role="status">Record saved privately.</p>}
  </form>;
}

const reviewChoices = ["unreviewed", "review_requested", "feedback_received"];

/** Review-status change and delete controls for one saved module record or batch. */
export function RecordActions({ id, target, label, review, redirectTo }: {
  id: string; target: "records" | "batches"; label: string; review?: string; redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (task: () => Promise<{ error?: string }>, after?: () => void) => start(async () => {
    const result = await task();
    setError(result.error ?? "");
    if (!result.error) after?.();
  });
  return <div className="actions">
    {review !== undefined && <label>Review status (farmer-recorded)
      <select defaultValue={review} disabled={pending} aria-label={`Review status for ${label}`}
        onChange={(event) => run(() => setRustReview(id, event.target.value))}>
        {reviewChoices.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
    </label>}
    <button type="button" className="button-outline button" disabled={pending}
      onClick={() => {
        const scope = target === "batches" ? " and all of its inspections" : "";
        if (window.confirm(`Delete ${label}${scope}? This cannot be undone.`))
          run(() => deleteAgriculture(target, id), () => redirectTo && router.replace(redirectTo));
      }}>{pending ? "Working…" : `Delete ${target === "batches" ? "batch" : "record"}`}</button>
    {error && <p role="alert" className="message-error">{error}</p>}
  </div>;
}

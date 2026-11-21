"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <section className="card panel stack" role="alert">
      <h1>Could not load this page</h1>
      <p>Check your connection and Supabase setup, then try again.</p>
      <div className="actions">
        <button
          className="button"
          onClick={() => {
            router.refresh();
            reset();
          }}
        >
          Retry
        </button>
        <Link className="text-link" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </section>
  );
}

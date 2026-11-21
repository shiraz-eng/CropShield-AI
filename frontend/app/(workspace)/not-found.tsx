import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card panel stack">
      <h1>Field unavailable</h1>
      <p>This field is missing or unavailable to this account.</p>
      <Link className="text-link" href="/fields">
        Back to My Fields
      </Link>
    </section>
  );
}

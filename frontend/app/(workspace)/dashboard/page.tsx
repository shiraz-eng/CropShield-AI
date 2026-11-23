import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { dashboardStats, listFields, listObservations } from "@/lib/farm-data";
import { requireIdentity } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

async function farmToolCounts() {
  const { client, user } = await requireIdentity();
  return Promise.all([
    ...["irrigation", "rust"].map((kind) => client.from("agricultural_records")
      .select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", kind)),
    client.from("grain_batches").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
}

export default async function Page() {
  const [fields, observations, stats, counts] = await Promise.all([
    listFields(),
    listObservations(undefined, 12),
    dashboardStats(),
    farmToolCounts(),
  ]);
  return (
    <>
      <Dashboard fields={fields} observations={observations} stats={stats} />
      <section className="card panel actions" aria-label="Farm tools">
        <Link className="text-link" href="/aquaguard">AquaGuard · {counts[0].count == null ? "Irrigation and soil" : `${counts[0].count} irrigation and soil ${counts[0].count === 1 ? "record" : "records"}`}</Link>
        <Link className="text-link" href="/rustwatch">RustWatch · {counts[1].count == null ? "Suspected wheat rust" : `${counts[1].count} surveillance ${counts[1].count === 1 ? "record" : "records"}`}</Link>
        <Link className="text-link" href="/grainsafe">GrainSafe · {counts[2].count == null ? "Storage inspections" : `${counts[2].count} storage ${counts[2].count === 1 ? "batch" : "batches"}`}</Link>
      </section>
    </>
  );
}

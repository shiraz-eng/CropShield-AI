import { Dashboard } from "@/components/dashboard";
import { dashboardStats, listFields, listObservations } from "@/lib/farm-data";

export const metadata = { title: "Dashboard" };
export default async function Page() {
  const [fields, observations, stats] = await Promise.all([
    listFields(),
    listObservations(undefined, 12),
    dashboardStats(),
  ]);
  return (
    <Dashboard fields={fields} observations={observations} stats={stats} />
  );
}

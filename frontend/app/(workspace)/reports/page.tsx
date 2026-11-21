import { Reports } from "@/components/reports";
import { analyzedObservationIds, listComparisons, listFields, listObservations } from "@/lib/farm-data";

export const metadata = { title: "Reports" };

export default async function Page() {
  const [fields, observations, analyzed, comparisons] = await Promise.all([
    listFields(),
    listObservations(),
    analyzedObservationIds(),
    listComparisons(),
  ]);
  return (
    <Reports
      fields={fields}
      analyzed={observations.filter(({ id }) => analyzed.has(id))}
      comparisons={comparisons}
    />
  );
}

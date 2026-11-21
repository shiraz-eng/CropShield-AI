import { Comparison } from "@/components/comparison";
import { listComparisons, listFields, listObservations } from "@/lib/farm-data";

export const metadata = { title: "Crop Comparison" };

export default async function Page() {
  const [fields, observations, comparisons] = await Promise.all([
    listFields(),
    listObservations(),
    listComparisons(),
  ]);
  return <Comparison fields={fields} observations={observations} comparisons={comparisons} />;
}

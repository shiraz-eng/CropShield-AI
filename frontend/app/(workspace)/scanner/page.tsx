import { Scanner } from "@/components/scanner";
import { listFields } from "@/lib/farm-data";
export const metadata = { title: "Crop Scanner" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const [fields, { field }] = await Promise.all([
    listFields(true),
    searchParams,
  ]);
  return <Scanner fields={fields} initialField={field} />;
}

import { Scanner } from "@/components/scanner";
import { listFields } from "@/lib/farm-data";
import { VERCEL_OBSERVATION_BYTES } from "@/lib/farm-types";
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
  return (
    <Scanner
      fields={fields}
      initialField={field}
      maxTotalBytes={process.env.VERCEL === "1" ? VERCEL_OBSERVATION_BYTES : undefined}
    />
  );
}

import { Assistant } from "@/components/assistant";
import { listFields } from "@/lib/farm-data";
import { isUuid } from "@/lib/farm-validation";

export const metadata = { title: "AI Assistant" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string; batch?: string }>;
}) {
  const [fields, { field, batch }] = await Promise.all([
    listFields(true),
    searchParams,
  ]);
  const batchId = batch && isUuid(batch) ? batch : undefined;
  return <Assistant key={batchId ?? field} fields={fields} initialField={batchId ? undefined : field} initialBatch={batchId} />;
}

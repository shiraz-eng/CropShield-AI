import { Assistant } from "@/components/assistant";
import { listFields } from "@/lib/farm-data";

export const metadata = { title: "AI Assistant" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const [fields, { field }] = await Promise.all([
    listFields(true),
    searchParams,
  ]);
  return <Assistant key={field} fields={fields} initialField={field} />;
}

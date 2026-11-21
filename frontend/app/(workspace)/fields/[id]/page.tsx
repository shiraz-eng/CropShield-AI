import { FieldDetail } from "@/components/fields";
import { getField, listObservations } from "@/lib/farm-data";
import { notFound } from "next/navigation";

export const metadata = { title: "Field Details" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const field = await getField(id);
  if (!field) notFound();
  return (
    <FieldDetail
      key={`${id}-${tab ?? ""}`}
      field={field}
      observations={await listObservations(id)}
      initialTab={tab}
    />
  );
}

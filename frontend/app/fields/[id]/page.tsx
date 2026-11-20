import { FieldDetail } from "@/components/fields";
export const metadata = { title: "Field Details" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <FieldDetail key={`${id}-${tab ?? ""}`} id={id} initialTab={tab} />;
}

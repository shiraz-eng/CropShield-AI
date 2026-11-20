import { Comparison } from "@/components/comparison";
export const metadata = { title: "Crop Comparison" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const { field } = await searchParams;
  return <Comparison key={field} initialField={field} />;
}

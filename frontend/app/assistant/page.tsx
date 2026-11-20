import { Assistant } from "@/components/assistant";
export const metadata = { title: "AI Assistant" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const { field } = await searchParams;
  return <Assistant key={field} initialField={field} />;
}

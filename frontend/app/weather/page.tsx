import { Weather } from "@/components/weather";
export const metadata = { title: "Weather Guardian" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const { field } = await searchParams;
  return <Weather key={field} initialField={field} />;
}

import { AgriculturePage } from "@/components/agriculture-page";
export const metadata = { title: "AquaGuard AI" };
export default async function Page({ searchParams }: { searchParams: Promise<{ field?: string }> }) {
  return <AgriculturePage kind="irrigation" selection={(await searchParams).field} />;
}

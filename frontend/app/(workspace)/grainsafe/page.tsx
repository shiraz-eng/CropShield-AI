import { AgriculturePage } from "@/components/agriculture-page";
export const metadata = { title: "GrainSafe AI" };
export default async function Page({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  return <AgriculturePage kind="storage" selection={(await searchParams).batch} />;
}

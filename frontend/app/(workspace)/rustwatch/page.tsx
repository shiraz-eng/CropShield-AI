import { AgriculturePage } from "@/components/agriculture-page";
export const metadata = { title: "RustWatch AI" };
export default async function Page({ searchParams }: { searchParams: Promise<{ field?: string }> }) {
  return <AgriculturePage kind="rust" selection={(await searchParams).field} />;
}

import { Fields } from "@/components/fields";
import { listFields } from "@/lib/farm-data";

export const metadata = { title: "My Fields" };
export default async function Page() {
  return <Fields fields={await listFields()} />;
}

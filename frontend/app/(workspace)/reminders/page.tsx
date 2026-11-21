import { Reminders } from "@/components/reminders";
import { listFields, listReminders } from "@/lib/farm-data";

export const metadata = { title: "Reminders" };

export default async function Page() {
  const [fields, reminders] = await Promise.all([listFields(), listReminders()]);
  return <Reminders fields={fields} reminders={reminders} />;
}

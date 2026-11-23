import Link from "next/link";
import { Reminders } from "@/components/reminders";
import { SectionTitle } from "@/components/shared";
import { inspectionSubject, listFields, listModuleInspections, listReminders } from "@/lib/farm-data";

export const metadata = { title: "Reminders" };

export default async function Page() {
  const [fields, reminders, inspections] = await Promise.all([listFields(), listReminders(), listModuleInspections()]);
  const today = new Date().toISOString().slice(0, 10);
  return <>
    <Reminders fields={fields} reminders={reminders} />
    <section className="card panel stack" aria-labelledby="module-inspections">
      <SectionTitle title="Module inspection dates" />
      <p id="module-inspections">From the latest AquaGuard, RustWatch and GrainSafe records. Save a newer record in the module to replace a date. Dates use UTC.</p>
      {!inspections.length && <p>No module inspection dates are set.</p>}
      {inspections.map((item) => { const { id, module, due_on, href } = item; return <p key={id}>
        <Link className="text-link" href={href}>{module} · {inspectionSubject(item, fields)}</Link> · {due_on < today ? "overdue" : due_on === today ? "due today" : "due"} {due_on}
      </p>; })}
    </section>
  </>;
}

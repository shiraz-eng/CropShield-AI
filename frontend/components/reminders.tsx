"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import type { SavedReminder } from "@/lib/ai-types";
import type { FarmFeedback, SavedField } from "@/lib/farm-types";
import { addReminder, deleteReminder, setReminderCompleted } from "@/lib/reminder-actions";
import { EmptyState, PageHeader, SectionTitle } from "./shared";
import { Dialog } from "./ui/dialog";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export function Reminders({
  fields,
  reminders,
}: {
  fields: SavedField[];
  reminders: SavedReminder[];
}) {
  const active = fields.filter(({ is_archived }) => !is_archived);
  const [filter, setFilter] = useState("");
  const [completed, setCompleted] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, save, saving] = useActionState(
    async (previous: FarmFeedback, form: FormData) => {
      const result = await addReminder(previous, form);
      if (result.message) setOpen(false);
      return result;
    },
    {},
  );
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({});
  const [pending, start] = useTransition();
  const items = reminders.filter(
    (item) => item.completed === completed && (!filter || filter === item.field_id),
  );
  const fieldName = (id: string) => fields.find((field) => field.id === id)?.name ?? "Field";
  const run = (action: () => Promise<{ error?: string; message?: string }>) =>
    start(async () => setFeedback(await action()));

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Plan wheat observations, inspections, and follow-up work."
        icon={CalendarDays}
        action={
          <Dialog
            open={open}
            onOpenChange={setOpen}
            title="Add reminder"
            description="Reminders are saved to your account and shown in the app."
            trigger={
              <button className="button" disabled={!active.length}>
                <Plus size={17} />
                Add reminder
              </button>
            }
          >
            <form className="stack" action={save}>
              <label>
                Task
                <input name="title" required pattern=".*\S.*" maxLength={90} placeholder="Crop inspection" />
              </label>
              <label>
                Field
                <select name="field" aria-label="Field" defaultValue={active[0]?.id}>
                  {active.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input type="date" name="date" required min={today()} defaultValue={plusDays(20)} />
              </label>
              <small>The default date is 20 days ahead, inside the 15–25 day comparison window.</small>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save reminder"}
              </button>
              {saved.error && <p className="message-error" role="alert">{saved.error}</p>}
            </form>
          </Dialog>
        }
      />
      <p>Reminders appear in the app and in the notification menu. They are not sent by email or SMS.</p>
      {saved.message && <p className="message-success" role="status">{saved.message}</p>}
      {feedback.error && <p className="message-error" role="alert">{feedback.error}</p>}
      <section className="card panel stack">
        <SectionTitle title="Reminder schedule" />
        <div className="tabs" aria-label="Reminder status">
          <button className="tab" aria-pressed={!completed} onClick={() => setCompleted(false)}>
            Upcoming
          </button>
          <button className="tab" aria-pressed={completed} onClick={() => setCompleted(true)}>
            Completed
          </button>
        </div>
        <label>
          Filter by field
          <select aria-label="Filter by field" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">All fields</option>
            {fields.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {items.length ? (
          items.map((reminder) => (
            <div className="list-row" key={reminder.id}>
              <input
                type="checkbox"
                aria-label={`Mark ${reminder.title} ${reminder.completed ? "not done" : "done"}`}
                checked={reminder.completed}
                disabled={pending}
                onChange={() => run(() => setReminderCompleted(reminder.id, !reminder.completed))}
              />
              <div className="grow">
                <strong>{reminder.title}</strong>
                <small>
                  {fieldName(reminder.field_id)} · {reminder.due_on}
                  {!reminder.completed && reminder.due_on < today() ? " · overdue" : ""}
                </small>
              </div>
              <button
                className="button button-outline"
                disabled={pending}
                onClick={() => run(() => deleteReminder(reminder.id))}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <EmptyState title="No reminders in this view">
            {active.length ? "Change the filter or add a reminder." : "Add an active field first."}
          </EmptyState>
        )}
      </section>
    </>
  );
}

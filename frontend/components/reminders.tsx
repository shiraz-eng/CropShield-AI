"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDemo } from "@/lib/state";
import {
  EmptyState,
  FieldSelect,
  MockDataNotice,
  PageHeader,
  ReminderCard,
  SectionTitle,
} from "./shared";
import { Dialog } from "./ui/dialog";

export function Reminders() {
  const { fields, reminders, setReminders, user, setUser } = useDemo();
  const [filter, setFilter] = useState("");
  const [completed, setCompleted] = useState(false);
  const [open, setOpen] = useState(false);
  const [field, setField] = useState(fields[0].id);
  const items = reminders
    .filter(
      (item) =>
        item.completed === completed && (!filter || filter === item.fieldId),
    )
    .toSorted((a, b) => a.date.localeCompare(b.date));

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    if (!title) return;
    setReminders((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        title,
        fieldId: field,
        date: String(data.get("date")),
        completed: false,
      },
    ]);
    setFilter("");
    setCompleted(false);
    setOpen(false);
  }

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
            description="This reminder is available during the current app session."
            trigger={
              <button className="button">
                <Plus size={17} />
                Add reminder
              </button>
            }
          >
            <form className="stack" onSubmit={add}>
              <label>
                Task
                <input
                  name="title"
                  required
                  pattern=".*\S.*"
                  maxLength={90}
                  placeholder="Crop inspection"
                />
              </label>
              <FieldSelect fields={fields} value={field} onChange={setField} />
              <label>
                Date
                <input type="date" name="date" required />
              </label>
              <button className="button" type="submit">
                Save reminder
              </button>
            </form>
          </Dialog>
        }
      />
      <MockDataNotice>
        Sample reminders and session changes. Reminders are not delivered
        outside the app.
      </MockDataNotice>
      <div className="grid-two">
        <section className="card panel stack">
          <SectionTitle title="Reminder schedule" />
          <div className="tabs" aria-label="Reminder status">
            <button
              className="tab"
              aria-pressed={!completed}
              onClick={() => setCompleted(false)}
            >
              Upcoming
            </button>
            <button
              className="tab"
              aria-pressed={completed}
              onClick={() => setCompleted(true)}
            >
              Completed
            </button>
          </div>
          <label>
            Filter by field
            <select
              aria-label="Filter by field"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All fields</option>
              {fields.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {items.length ? (
            <div>
              {items.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  fieldName={
                    fields.find(({ id }) => id === reminder.fieldId)?.name ??
                    "Field"
                  }
                  onToggle={() =>
                    setReminders((items) =>
                      items.map((item) =>
                        item.id === reminder.id
                          ? { ...item, completed: !item.completed }
                          : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No reminders in this view">
              Change the filter or add a reminder.
            </EmptyState>
          )}
        </section>
        <section className="card panel stack">
          <SectionTitle title="Inspection preferences" />
          <label>
            Inspection interval
            <select
              aria-label="Inspection interval"
              value={user.interval}
              onChange={(event) =>
                setUser((value) => ({
                  ...value,
                  interval: Number(event.target.value),
                }))
              }
            >
              {[7, 15, 20, 25, 30].map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>
          <label className="check-setting">
            <input
              type="checkbox"
              checked={user.notifications}
              onChange={(event) =>
                setUser((value) => ({
                  ...value,
                  notifications: event.target.checked,
                }))
              }
            />
            Show in-app notifications
          </label>
          <p>
            The interval is a preference for planning inspections. New reminders
            use the date you choose.
          </p>
        </section>
      </div>
    </>
  );
}

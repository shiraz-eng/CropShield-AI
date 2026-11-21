"use server";

import { revalidatePath } from "next/cache";
import { identity } from "./supabase/server";
import { formText, isDate, isUuid } from "./farm-validation";
import type { FarmFeedback } from "./farm-types";

const sessionError = { error: "Your session expired. Sign in and try again." };

function refresh() {
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
}

export async function addReminder(_: FarmFeedback, form: FormData): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  const title = formText(form, "title");
  const fieldId = formText(form, "field");
  const dueOn = formText(form, "date");
  if (!title || title.length > 90 || !isUuid(fieldId) || !isDate(dueOn))
    return { error: "Enter a task, choose a field, and pick a date." };
  const { data, error } = await auth.client
    .from("reminders")
    .insert({ user_id: auth.user.id, field_id: fieldId, title, due_on: dueOn })
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Could not save the reminder. Check the field and try again." };
  refresh();
  return { message: "Reminder saved.", id: data.id };
}

export async function setReminderCompleted(id: string, completed: boolean): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  if (!isUuid(id)) return { error: "Reminder unavailable." };
  const { data, error } = await auth.client
    .from("reminders")
    .update({ completed })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Could not update the reminder." };
  refresh();
  return { message: completed ? "Reminder completed." : "Reminder reopened." };
}

export async function deleteReminder(id: string): Promise<FarmFeedback> {
  const auth = await identity();
  if (!auth) return sessionError;
  if (!isUuid(id)) return { error: "Reminder unavailable." };
  const { error } = await auth.client.from("reminders").delete().eq("id", id).eq("user_id", auth.user.id);
  if (error) return { error: "Could not delete the reminder." };
  refresh();
  return { message: "Reminder deleted." };
}

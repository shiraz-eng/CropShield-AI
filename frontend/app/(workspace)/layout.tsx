import { AppShell } from "@/components/shell";
import { PortalGuide } from "@/components/portal-guide";
import { DemoProvider } from "@/lib/state";
import { requireIdentity } from "@/lib/supabase/server";
import { dueReminderNotices, listFields, listModuleInspections, listReminders, moduleInspectionNotices } from "@/lib/farm-data";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client, user } = await requireIdentity();
  const [{ data: profile, error }, fields, reminders, inspections] = await Promise.all([
    client
      .from("profiles")
      .select("full_name,preferred_language")
      .eq("id", user.id)
      .maybeSingle(),
    listFields(),
    listReminders(),
    listModuleInspections(),
  ]);
  const notices = [
    ...dueReminderNotices(reminders, fields),
    ...moduleInspectionNotices(inspections, fields),
  ];
  if (error) throw new Error("Could not load the account profile.");
  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim().slice(0, 100)
      : "";
  return (
    <DemoProvider
      key={user.id}
      notices={notices}
      account={{
        name:
          profile?.full_name ||
          metadataName ||
          user.email?.split("@")[0] ||
          "Farmer",
        email: user.email ?? "",
        language: profile?.preferred_language === "Urdu" ? "Urdu" : "English",
        units: "C",
        interval: 20,
        notifications: true,
      }}
    >
      <AppShell fields={fields.map(({ id, name }) => ({ id, name }))}>
        {children}
      </AppShell>
      <PortalGuide />
    </DemoProvider>
  );
}

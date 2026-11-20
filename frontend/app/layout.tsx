import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { AppShell } from "@/components/shell";
import { DemoProvider } from "@/lib/state";

export const metadata: Metadata = {
  title: { default: "CropShield AI", template: "%s | CropShield AI" },
  description: "A wheat monitoring workspace with illustrative field data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}

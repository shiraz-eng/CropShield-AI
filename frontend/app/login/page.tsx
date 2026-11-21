import { AuthPage } from "@/components/auth-page";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; password?: string }>;
}) {
  const { link, password } = await searchParams;
  const notice =
    link === "expired"
      ? "This link is invalid or expired. Request a new link."
      : password === "updated"
        ? "Password updated. Sign in with your new password."
        : undefined;
  return <AuthPage mode="login" notice={notice} />;
}

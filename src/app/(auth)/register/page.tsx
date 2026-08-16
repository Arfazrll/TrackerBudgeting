import { redirect } from "next/navigation";
import { AuthPageContent } from "@/components/auth-page-content";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/auth-config";

export const metadata = { title: "Sign up" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user?.status === "ACTIVE") redirect("/dashboard");

  return (
    <AuthShell>
      <AuthPageContent mode="register" googleEnabled={isGoogleAuthConfigured()} />
    </AuthShell>
  );
}

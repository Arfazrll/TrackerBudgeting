import { redirect } from "next/navigation";
import { AuthPageContent } from "@/components/auth-page-content";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/auth-config";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.status === "ACTIVE") redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");

  return (
    <AuthShell>
      <AuthPageContent mode="login" googleEnabled={isGoogleAuthConfigured()} />
    </AuthShell>
  );
}

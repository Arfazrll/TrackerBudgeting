import { SettingsView } from "@/components/settings-view";
import { requirePageUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser({ allowAdmin: true });
  return <SettingsView user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }} />;
}

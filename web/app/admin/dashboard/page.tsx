import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getCurrentAppUser } from "@/lib/supabase-server";

export default async function Page() {
  const me = await getCurrentAppUser();
  if (!me) redirect("/sign-in?next=/admin/dashboard");
  if (me.actualRole !== "admin") redirect("/chat");
  return (
    <AppShell
      title="Dashboard"
      subtitle="student activity, registrations, and usage"
    >
      <AdminDashboard />
    </AppShell>
  );
}

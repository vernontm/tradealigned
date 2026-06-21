import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminView } from "@/components/admin-view";
import { getCurrentAppUser } from "@/lib/supabase-server";

export default async function Page() {
  const me = await getCurrentAppUser();
  if (!me) redirect("/sign-in?next=/admin");
  // Use actualRole so an admin who flipped on "view as student" can still
  // reach /admin (otherwise they'd be locked out of the toggle that got them
  // there). Real users are still blocked.
  if (me.actualRole !== "admin") redirect("/chat");
  return (
    <AppShell title="Admin" subtitle="manage users, tiers, and roles">
      <AdminView />
    </AppShell>
  );
}

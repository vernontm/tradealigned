import { AppShell } from "@/components/app-shell";
import { AccountView } from "@/components/account-view";

export default function Page() {
  return (
    <AppShell
      title="Account"
      subtitle="your profile, Discord, and subscription"
    >
      <AccountView />
    </AppShell>
  );
}

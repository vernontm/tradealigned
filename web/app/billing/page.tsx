import { AppShell } from "@/components/app-shell";
import { BillingView } from "@/components/billing-view";

export default function Page() {
  return (
    <AppShell
      title="Billing"
      subtitle="manage your subscription and credits"
    >
      <BillingView />
    </AppShell>
  );
}

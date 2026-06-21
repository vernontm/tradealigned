import { AppShell } from "@/components/app-shell";
import { PricingView } from "@/components/pricing-view";

export default function Page() {
  return (
    <AppShell title="Plans" subtitle="pick what fits how you trade">
      <PricingView />
    </AppShell>
  );
}

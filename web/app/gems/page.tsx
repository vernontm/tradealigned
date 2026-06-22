import { AppShell } from "@/components/app-shell";
import { GemsView } from "@/components/gems-view";

export default function Page() {
  return (
    <AppShell title="Gems" subtitle="lessons, principles, and moments worth pinning">
      {/* GemsView does its own per-item paywall: free accounts see the first
          10 gems unblurred, the rest blurred behind an upgrade prompt. */}
      <GemsView />
    </AppShell>
  );
}

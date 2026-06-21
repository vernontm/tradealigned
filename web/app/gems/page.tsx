import { AppShell } from "@/components/app-shell";
import { GemsView } from "@/components/gems-view";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  return (
    <AppShell title="Gems" subtitle="lessons, principles, and moments worth pinning">
      <TierGate
        feature="Gems"
        pitch="hours of Ray's teaching, compressed into the one-paragraph principles that actually move your trading, auto-titled, auto-clipped, and searchable."
      >
        <GemsView />
      </TierGate>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { ProgressView } from "@/components/progress-view";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  return (
    <AppShell
      title="My Progress"
      subtitle="accuracy, streaks, and where to drill next"
    >
      <TierGate
        feature="Progress tracking"
        pitch="weekly accuracy reports, streaks, and per-drill stats so you can see which setups your eye still misses."
      >
        <ProgressView />
      </TierGate>
    </AppShell>
  );
}

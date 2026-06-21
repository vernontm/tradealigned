import { AppShell } from "@/components/app-shell";
import { CommunityView } from "@/components/community-view";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  return (
    <AppShell
      title="Community"
      subtitle="how the TGFX students are stacking up"
    >
      <TierGate
        feature="Community"
        pitch="see how every TGFX student is stacking up, leaderboards, weekly P&L, and the trades the room is calling in real time."
      >
        <CommunityView />
      </TierGate>
    </AppShell>
  );
}

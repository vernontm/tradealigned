import { AppShell } from "@/components/app-shell";
import { LibraryView } from "@/components/library-view";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  return (
    <AppShell
      title="Library"
      subtitle="every trade Ray has indexed, filter, sort, study"
    >
      <TierGate
        feature="The Trade Library"
        pitch="every trade Ray has indexed, filter by instrument, direction, setup, outcome. real screenshots and clips on each entry."
      >
        <LibraryView />
      </TierGate>
    </AppShell>
  );
}

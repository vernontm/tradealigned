import { AppShell } from "@/components/app-shell";
import { CommunityView } from "@/components/community-view";

export default function Page() {
  return (
    <AppShell
      title="Community"
      subtitle="how the TGFX students are stacking up"
    >
      <CommunityView />
    </AppShell>
  );
}

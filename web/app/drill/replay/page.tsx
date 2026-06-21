import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReplayView } from "@/components/replay-view";
import { TierGate } from "@/components/tier-gate";

export default function Page() {
  return (
    <AppShell
      title="Replay / Predict"
      subtitle="call the next move on Ray's real charts"
    >
      <TierGate
        feature="Replay / Predict"
        pitch="see Ray's actual entry chart, call up or down, then watch how the trade played out. real charts, real outcomes."
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-zinc-200/60 bg-white/60 px-5 py-2.5">
            <Link
              href="/drill"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
            >
              <ArrowLeft className="h-3 w-3" /> back to drills
            </Link>
          </div>
          <div className="min-h-0 flex-1">
            <ReplayView />
          </div>
        </div>
      </TierGate>
    </AppShell>
  );
}

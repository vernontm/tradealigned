"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { setViewAs } from "@/lib/view-as";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Persistent strip that appears at the top of the AppShell whenever an admin
 * is viewing the app as a student. Provides a one-click exit so they can't
 * forget what mode they're in.
 */
export function ViewAsBanner() {
  const router = useRouter();
  const { actualRole, viewAs, loaded } = useCurrentUser();

  if (!loaded || actualRole !== "admin" || viewAs !== "student") return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200 sm:px-4">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        viewing the app as a student, admin chrome is hidden.
      </span>
      <button
        type="button"
        onClick={() => {
          setViewAs("admin");
          router.refresh();
        }}
        className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100 hover:bg-amber-500/30"
      >
        exit
      </button>
    </div>
  );
}

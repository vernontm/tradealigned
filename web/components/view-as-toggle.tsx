"use client";

import { Eye, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { setViewAs } from "@/lib/view-as";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Topbar pill that lets a real admin toggle "view as student". The pill is
 * hidden for non-admins. Flipping it re-fetches the route so server components
 * pick up the new cookie immediately.
 */
export function ViewAsToggle() {
  const router = useRouter();
  const { actualRole, viewAs, loaded } = useCurrentUser();

  if (!loaded || actualRole !== "admin") return null;

  const flip = () => {
    setViewAs(viewAs === "student" ? "admin" : "student");
    // Server components / API gates read the cookie, refresh so they re-run.
    router.refresh();
  };

  if (viewAs === "student") {
    return (
      <button
        type="button"
        onClick={flip}
        title="exit student view and return to admin"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-400/40 transition hover:bg-amber-500/30"
      >
        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
        student view
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={flip}
      title="see the app the way a student sees it"
      className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-200 sm:inline-flex"
    >
      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
      view as student
    </button>
  );
}

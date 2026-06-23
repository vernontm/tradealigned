import { Download, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";

type Resource = {
  title: string;
  description: string;
  href: string;
  badge?: string;
};

const RESOURCES: Resource[] = [
  {
    title: "Official TGFX Trading Plan",
    description:
      "The complete strategy: morning prep checklist, the premium/discount direction filter, the full entry decision tree, stop-loss rules, and a daily trade-review journal. This is the plan Trade AI grades your charts against.",
    href: "/resources/tgfx-trading-plan.pdf",
    badge: "PDF",
  },
];

export default function Page() {
  return (
    <AppShell
      title="Resources"
      subtitle="the official trading plan and study material"
    >
      <div className="h-full min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {RESOURCES.map((r) => (
            <a
              key={r.href}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition hover:border-emerald-400/40 hover:bg-emerald-500/[0.04]"
            >
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                <FileText className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-zinc-100">
                    {r.title}
                  </h3>
                  {r.badge && (
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                      {r.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {r.description}
                </p>
              </div>
              <Download
                className="mt-1 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:text-emerald-300"
                strokeWidth={2}
              />
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

import { AppShell } from "./app-shell";

export function ComingSoon({
  title,
  subtitle,
  description,
  eta,
}: {
  title: string;
  subtitle: string;
  description: string;
  eta: string;
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="inline-flex rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow">
            coming soon
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">{title}</h2>
          <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
          <div className="text-xs text-zinc-400">eta: {eta}</div>
        </div>
      </div>
    </AppShell>
  );
}

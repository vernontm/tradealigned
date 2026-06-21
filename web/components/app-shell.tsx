import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ViewAsBanner } from "./view-as-banner";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh gap-2 p-2 sm:gap-3 sm:p-3">
      <Sidebar />
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2 sm:gap-3">
        <Topbar title={title} subtitle={subtitle} />
        <ViewAsBanner />
        <main className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-zinc-100 shadow-xl ring-1 ring-zinc-800">
          {children}
        </main>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LessonPlayer } from "@/components/lesson-player";
import { getCourseModule } from "@/lib/courses";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ course: string; lesson: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { course: courseSlug, lesson: lessonId } = await params;
  const { t } = await searchParams;
  const mod = await getCourseModule(courseSlug);
  if (!mod) notFound();

  const idx = mod.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const current = mod.lessons[idx];
  const prev = idx > 0 ? mod.lessons[idx - 1] : null;
  const next = idx < mod.lessons.length - 1 ? mod.lessons[idx + 1] : null;

  const seek = Math.max(0, Math.floor(Number(t) || 0));

  return (
    <AppShell
      title={current.display_name ?? "Lesson"}
      subtitle={`${mod.title} · lesson ${idx + 1} of ${mod.lessons.length}`}
    >
      <LessonPlayer
        lessonId={current.id}
        courseSlug={courseSlug}
        prevHref={prev ? `/education/${courseSlug}/${prev.id}` : null}
        nextHref={next ? `/education/${courseSlug}/${next.id}` : null}
        prevTitle={prev?.display_name ?? null}
        nextTitle={next?.display_name ?? null}
        positionLabel={`${idx + 1} / ${mod.lessons.length}`}
        backHref={`/education/${courseSlug}`}
        initialPosition={seek}
        initialCompleted={false}
      />
    </AppShell>
  );
}

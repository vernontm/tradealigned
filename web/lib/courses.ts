import "server-only";
import { supabase } from "./supabase";
import { createSupabaseServer } from "./supabase-server";

/**
 * The course library is stored as videos with kind='teaching'. We derive the
 * module name from the parent folder of the source_path. e.g.
 *   /Volumes/.../00000 tgfx course full 2026/Beginners Course/order_blocks.mp4
 * → module: "Beginners Course"
 */

export type CourseVideo = {
  id: string;
  filename: string;
  display_name: string | null;
  source_path: string | null;
  duration_sec: number | null;
  thumb_url: string | null;
  storage_path: string | null;
  /** Short-lived signed URL for thumb_url, populated by getAllCourseModules. */
  signed_thumb_url?: string | null;
};

export type CourseModule = {
  slug: string;
  title: string;
  position: number;
  lessons: CourseVideo[];
  total_duration_sec: number;
};

const COURSE_ROOT_MARKERS = [
  "00000 tgfx course full 2026",
  "tgfx-course",
];

/**
 * Display-name overrides for folders whose raw name doesn't read well in the UI.
 * Keyed by the trimmed, lowercased raw folder name.
 */
const MODULE_RENAMES: Record<string, string> = {
  "888": "888 Inner Market Mastery",
  "00000 tgfx course full 2026": "Webinar",
};

function deriveModuleFromPath(p: string | null): string {
  if (!p) return "Misc";
  const parts = p.split(/[\\/]/).filter(Boolean);
  // Find the index of any known course root marker
  let i = -1;
  for (const m of COURSE_ROOT_MARKERS) {
    const idx = parts.findIndex((seg) => seg.toLowerCase() === m.toLowerCase());
    if (idx >= 0) {
      i = idx;
      break;
    }
  }
  let raw: string;
  if (i >= 0 && parts[i + 1] && i + 2 < parts.length) {
    raw = parts[i + 1];
  } else {
    raw = parts.length >= 2 ? parts[parts.length - 2] : "Misc";
  }
  const trimmed = raw.trim();
  return MODULE_RENAMES[trimmed.toLowerCase()] ?? trimmed;
}

function cleanFilenameTitle(name: string | null): string {
  if (!name) return "Untitled";
  let s = name.replace(/\.[^.]+$/, ""); // drop extension
  // Strip resolution suffixes like "(1080p)" or "(720p)"
  s = s.replace(/\s*\((?:\d+p|HD)\)\s*/gi, " ");
  // Normalize underscores + hyphens to spaces
  s = s.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  // Title-case but preserve common acronyms
  return s
    .split(" ")
    .map((w) =>
      /^(rvfx|tgfx|fvg|iop|h1|h4|m1|m5|m15|w20|fomo|mt4|ict|tps|am|pm)$/i.test(w)
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

export function slugifyModule(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "module";
}

const MODULE_ORDER: Record<string, number> = {
  "beginners course": 1,
  "beginners": 1,
  "intermediate": 2,
  "advanced": 3,
  "888 inner market mastery": 4,
  "psychology": 5,
  "futures": 6,
  "webinar": 7,
};

export async function getAllCourseModules(): Promise<CourseModule[]> {
  const { data } = await supabase
    .from("videos")
    .select(
      "id, filename, display_name, source_path, duration_sec, thumb_url, storage_path"
    )
    .eq("kind", "teaching")
    .order("filename", { ascending: true });
  const videos = (data as CourseVideo[] | null) ?? [];

  const byModule = new Map<string, CourseVideo[]>();
  for (const v of videos) {
    const mod = deriveModuleFromPath(v.source_path);
    const arr = byModule.get(mod) ?? [];
    arr.push(v);
    byModule.set(mod, arr);
  }

  const modules: CourseModule[] = Array.from(byModule.entries()).map(
    ([title, lessons]) => ({
      slug: slugifyModule(title),
      title,
      position:
        MODULE_ORDER[title.toLowerCase()] ??
        99 - 0 + title.charCodeAt(0) / 100,
      lessons: lessons
        .map((l) => ({
          ...l,
          display_name: l.display_name || cleanFilenameTitle(l.filename),
        }))
        .sort((a, b) => (a.filename || "").localeCompare(b.filename || "")),
      total_duration_sec: lessons.reduce(
        (acc, l) => acc + (l.duration_sec ?? 0),
        0
      ),
    })
  );

  modules.sort((a, b) => a.position - b.position);

  // Batch-sign thumbnails so the grid renders without N+1 round-trips.
  const thumbKeys = videos
    .map((v) => v.thumb_url)
    .filter((k): k is string => !!k);
  const signedMap = new Map<string, string>();
  if (thumbKeys.length > 0) {
    const { data: signed } = await supabase.storage
      .from("course-videos")
      .createSignedUrls(thumbKeys, 60 * 60 * 6);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
    }
  }
  for (const m of modules) {
    for (const l of m.lessons) {
      l.signed_thumb_url = l.thumb_url ? signedMap.get(l.thumb_url) ?? null : null;
    }
  }

  return modules;
}

export async function getCourseModule(slug: string): Promise<CourseModule | null> {
  const all = await getAllCourseModules();
  return all.find((m) => m.slug === slug) ?? null;
}

export function cleanLessonTitle(name: string | null): string {
  return cleanFilenameTitle(name);
}

export type LessonProgress = {
  completedIds: Set<string>;
  inProgressIds: Set<string>;
  positionByLesson: Map<string, number>;
};

/**
 * Fetch the current user's progress over a set of lesson ids.
 * Returns empty sets when there's no signed-in user (renders fine).
 */
export async function getLessonProgressFor(
  lessonIds: string[]
): Promise<LessonProgress> {
  const empty: LessonProgress = {
    completedIds: new Set(),
    inProgressIds: new Set(),
    positionByLesson: new Map(),
  };
  if (lessonIds.length === 0) return empty;
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return empty;
  const { data } = await sb
    .from("lesson_progress")
    .select("lesson_id, position_sec, completed")
    .eq("auth_user_id", user.id)
    .in("lesson_id", lessonIds);
  const completedIds = new Set<string>();
  const inProgressIds = new Set<string>();
  const positionByLesson = new Map<string, number>();
  for (const r of (data as
    | { lesson_id: string; position_sec: number; completed: boolean }[]
    | null) ?? []) {
    if (r.completed) completedIds.add(r.lesson_id);
    else if ((r.position_sec ?? 0) > 5) inProgressIds.add(r.lesson_id);
    positionByLesson.set(r.lesson_id, r.position_sec ?? 0);
  }
  return { completedIds, inProgressIds, positionByLesson };
}

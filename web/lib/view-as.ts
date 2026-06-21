"use client";

/**
 * Admin "view as student" toggle.
 *
 * When an admin flips this on, the UI behaves as if they were a regular user:
 *  - admin-only chrome (curation strips, fix-outcome buttons, archive toggle,
 *    edit chips) disappears
 *  - server endpoints that gate on role respect the toggle via the
 *    `view-as=student` cookie set here, so trades / outcomes the student can't
 *    see really do get filtered out at the SQL layer (not just hidden visually)
 *
 * Server reads the cookie in `lib/view-as-server.ts`; combine with the real
 * role at every admin gate so a student adding the cookie themselves can't
 * escalate.
 */

const STORAGE_KEY = "ray-ai.view-as.v1";
const COOKIE_NAME = "view-as";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

export type ViewAs = "admin" | "student";

function read(): ViewAs {
  if (typeof window === "undefined") return "admin";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "student" ? "student" : "admin";
  } catch {
    return "admin";
  }
}

function writeCookie(value: ViewAs) {
  if (typeof document === "undefined") return;
  if (value === "admin") {
    // Clear the cookie when going back to admin view.
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=student; path=/; max-age=${COOKIE_MAX_AGE_SEC}; samesite=lax`;
  }
}

export function getViewAs(): ViewAs {
  return read();
}

export function setViewAs(value: ViewAs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota
  }
  writeCookie(value);
  window.dispatchEvent(new CustomEvent("ray-ai-view-as-changed"));
}

export function onViewAsChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-ai-view-as-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) cb();
  });
  return () =>
    window.removeEventListener("ray-ai-view-as-changed", handler);
}

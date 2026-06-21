"use client";

/**
 * Per-browser profile store. Holds the student's display name, Discord handle,
 * city, and a stable avatar hue. Once Clerk + Supabase land, the same shape
 * syncs to the `app_users` table.
 */

export type Profile = {
  display_name: string;
  discord_handle: string;
  city: string;
  bio: string;
  avatar_hue: number; // 0..360
};

const STORAGE_KEY = "ray-ai-profile.v1";

const DEFAULT_HUE = Math.floor(Math.random() * 360);

export const EMPTY_PROFILE: Profile = {
  display_name: "",
  discord_handle: "",
  city: "",
  bio: "",
  avatar_hue: DEFAULT_HUE,
};

function read(): Profile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const j = JSON.parse(raw) as Partial<Profile>;
    return {
      display_name: typeof j.display_name === "string" ? j.display_name : "",
      discord_handle:
        typeof j.discord_handle === "string" ? j.discord_handle : "",
      city: typeof j.city === "string" ? j.city : "",
      bio: typeof j.bio === "string" ? j.bio : "",
      avatar_hue:
        typeof j.avatar_hue === "number" ? j.avatar_hue : DEFAULT_HUE,
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function write(p: Profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("ray-profile-changed"));
  } catch {
    // quota / disabled
  }
}

export function getProfile(): Profile {
  return read();
}

export function saveProfile(p: Profile) {
  write(p);
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("ray-profile-changed"));
}

/** Subscribe to profile changes (returns an unsubscribe fn). */
export function onProfileChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("ray-profile-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) cb();
  });
  return () => window.removeEventListener("ray-profile-changed", handler);
}

/** Normalize a Discord handle, strip leading "@" or full Discord URL. */
export function cleanDiscordHandle(input: string): string {
  let s = input.trim();
  if (!s) return "";
  // Strip discord.com/users/... URLs back to just the handle
  s = s.replace(/^https?:\/\/(?:www\.)?discord(?:app)?\.com\/users\/\d+\/?/i, "");
  s = s.replace(/^@/, "");
  return s;
}

import "server-only";
import { cookies } from "next/headers";

/**
 * Server companion to `lib/view-as.ts`. Reads the `view-as` cookie an admin
 * set when they flipped on "view as student". Combine this with the real role
 * from `getCurrentAppUser()` at every admin gate so a non-admin cannot
 * escalate by setting the cookie themselves.
 */
export async function getViewAsCookie(): Promise<"admin" | "student"> {
  try {
    const store = await cookies();
    const v = store.get("view-as")?.value;
    return v === "student" ? "student" : "admin";
  } catch {
    return "admin";
  }
}

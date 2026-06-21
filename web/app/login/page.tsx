import { redirect } from "next/navigation";

// Alias for the real auth surface, `/sign-in` is the canonical path.
// People will type /login out of habit; bounce them there.
export default function Page() {
  redirect("/sign-in");
}

import { redirect } from "next/navigation";

// One auth form serves both flows; the mode query param picks the right one.
export default function Page() {
  redirect("/sign-in?mode=signup");
}

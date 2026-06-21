import { redirect } from "next/navigation";

export default function Page() {
  // Insights folded into Mentor Chat, keep the URL alive with a redirect.
  redirect("/");
}

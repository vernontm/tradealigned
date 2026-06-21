import { supabase } from "@/lib/supabase";

export async function GET() {
  const { count } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("kind", "teaching");
  return Response.json({ total_lessons: count ?? 0 });
}

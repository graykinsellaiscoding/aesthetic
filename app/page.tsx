import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function Home() {
  const supabase = createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Check if user has completed onboarding (has a profile)
  const { data: profile } = await supabase
    .from("user_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  redirect("/feed");
}

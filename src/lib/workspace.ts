import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_memberships").select("workspace_id, role")
    .eq("user_id", user.id).order("created_at", { ascending: true })
    .limit(1).maybeSingle();
  if (membershipError) throw new Error("Gagal memuat workspace. Coba muat ulang.");
  if (!membership) redirect("/workspace/new");
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces").select("id, name, timezone")
    .eq("id", membership.workspace_id).single();
  if (workspaceError || !workspace) throw new Error("Workspace tidak dapat diakses.");
  return { supabase, user, workspace, role: membership.role };
}

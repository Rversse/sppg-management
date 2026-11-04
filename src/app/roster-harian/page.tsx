import { requireWorkspace } from "@/lib/workspace";
import { DailyRosterWorkspace } from "@/components/daily-roster-workspace";

export const dynamic = "force-dynamic";

export default async function DailyRosterPage() {
  const { workspace, role } = await requireWorkspace();
  return <DailyRosterWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

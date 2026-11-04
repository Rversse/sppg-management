import { requireWorkspace } from "@/lib/workspace";
import { WorkforceWorkspace } from "@/components/workforce-workspace";

export default async function AttendancePage() {
  const { workspace, role } = await requireWorkspace();
  return <WorkforceWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

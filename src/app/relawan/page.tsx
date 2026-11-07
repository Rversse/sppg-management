import { requireWorkspace } from "@/lib/workspace";
import { WorkforceWorkspace } from "@/components/workforce-workspace";

export const dynamic = "force-dynamic";

export default async function VolunteersPage() {
  const { workspace, role } = await requireWorkspace();
  return <WorkforceWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} timezone={workspace.timezone} />;
}

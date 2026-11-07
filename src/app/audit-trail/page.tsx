import { requireWorkspace } from "@/lib/workspace";
import { WorkforceAuditWorkspace } from "@/components/workforce-audit-workspace";

export const dynamic = "force-dynamic";

export default async function AuditTrailPage() {
  const { workspace, role } = await requireWorkspace();
  return <WorkforceAuditWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

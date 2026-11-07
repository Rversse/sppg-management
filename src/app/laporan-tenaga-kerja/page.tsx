import { WorkforceReportWorkspace } from "@/components/workforce-report-workspace";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WorkforceReportPage() {
  const { workspace, role } = await requireWorkspace();
  return <WorkforceReportWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} timezone={workspace.timezone} />;
}

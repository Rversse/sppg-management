import { OperationalReportWorkspace } from "@/components/operational-report-workspace";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function OperationalReportPage() {
  const { workspace, role } = await requireWorkspace();
  return <OperationalReportWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} timezone={workspace.timezone} />;
}

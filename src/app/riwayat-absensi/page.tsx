import { AttendanceHistoryWorkspace } from "@/components/attendance-history-workspace";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AttendanceHistoryPage() {
  const { workspace, role } = await requireWorkspace();
  return <AttendanceHistoryWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

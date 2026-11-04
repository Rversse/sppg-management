import { requireWorkspace } from "@/lib/workspace";
import { PayrollWorkspace } from "@/components/payroll-workspace";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const { workspace, role } = await requireWorkspace();
  return <PayrollWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

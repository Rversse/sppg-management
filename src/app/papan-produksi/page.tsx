import { ProductionBoardWorkspace } from "@/components/production-board-workspace";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const { workspace, role } = await requireWorkspace();
  return <ProductionBoardWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

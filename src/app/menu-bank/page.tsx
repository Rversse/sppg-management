import { requireWorkspace } from "@/lib/workspace";
import { MenuBankWorkspace } from "@/components/menu-bank-workspace";

export const dynamic = "force-dynamic";

export default async function MenuBankPage() {
  const { workspace, role } = await requireWorkspace();
  return <MenuBankWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

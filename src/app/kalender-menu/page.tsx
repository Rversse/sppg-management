import { MenuCalendarWorkspace } from "@/components/menu-calendar-workspace";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function MenuCalendarPage() {
  const { workspace, role } = await requireWorkspace();
  return <MenuCalendarWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} />;
}

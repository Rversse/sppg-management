import { requireWorkspace } from "@/lib/workspace";
import { WorkScheduleWorkspace } from "@/components/work-schedule-workspace";
export const dynamic = "force-dynamic";
export default async function WorkSchedulePage(){const {workspace,role}=await requireWorkspace();return <WorkScheduleWorkspace workspaceId={workspace.id} workspaceName={workspace.name} role={role} timezone={workspace.timezone}/>;}

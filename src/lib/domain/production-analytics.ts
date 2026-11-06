export type ProductionPlan = {
  id: string;
  menu_id: string;
  planned_date: string;
  portion_count: number;
  status: string;
};
export type ProductionBatch = {
  id: string;
  menu_plan_id: string;
  portion_count: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};
export type ProductionBatchEvent = {
  id: number;
  batch_id: string;
  action: string;
  occurred_at: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
};
export type MenuLabel = { id: string; name: string; prep_duration_minutes: number | null; cook_duration_minutes: number | null };
export type ProductionMenuSummary = {
  menuId: string;
  menuName: string;
  planCount: number;
  plannedPortions: number;
  batchCount: number;
  completedBatches: number;
  blockedBatches: number;
  estimatedDurationMinutes: number | null;
  averageDurationMinutes: number | null;
  durationVarianceMinutes: number | null;
};
export type ProductionBlockerSummary = {
  reason: string;
  occurrences: number;
  latestAt: string;
};
export type ProductionReport = {
  planCount: number;
  plannedPortions: number;
  batchCount: number;
  completedBatches: number;
  blockedBatches: number;
  queuedBatches: number;
  averageDurationMinutes: number | null;
  menuSummaries: ProductionMenuSummary[];
  blockers: ProductionBlockerSummary[];
};

function validDuration(batch: ProductionBatch): number | null {
  if (batch.status !== "completed" || !batch.started_at || !batch.completed_at) return null;
  const duration = (Date.parse(batch.completed_at) - Date.parse(batch.started_at)) / 60_000;
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

export function buildProductionReport(
  plans: ProductionPlan[],
  batches: ProductionBatch[],
  events: ProductionBatchEvent[],
  menus: MenuLabel[]
): ProductionReport {
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const menuById = new Map(menus.map((menu) => [menu.id, menu.name]));
  const relevantBatches = batches.filter((batch) => planById.has(batch.menu_plan_id));
  const durations = relevantBatches.map(validDuration).filter((value): value is number => value !== null);
  const menuGroups = new Map<string, { plans: ProductionPlan[]; batches: ProductionBatch[] }>();

  for (const plan of plans) {
    const group = menuGroups.get(plan.menu_id) ?? { plans: [], batches: [] };
    group.plans.push(plan);
    menuGroups.set(plan.menu_id, group);
  }
  for (const batch of relevantBatches) {
    const plan = planById.get(batch.menu_plan_id);
    if (!plan) continue;
    const group = menuGroups.get(plan.menu_id) ?? { plans: [], batches: [] };
    group.batches.push(batch);
    menuGroups.set(plan.menu_id, group);
  }

  const blockerGroups = new Map<string, ProductionBlockerSummary>();
  for (const event of events) {
    if (event.action !== "UPDATE") continue;
    const after = event.after_data;
    const before = event.before_data;
    const eventPlanId = after?.menu_plan_id ?? before?.menu_plan_id;
    if (typeof eventPlanId !== "string" || !planById.has(eventPlanId)) continue;
    if (after?.status !== "blocked" || before?.status === "blocked") continue;
    const reason = typeof after.blocker_note === "string" ? after.blocker_note.trim() : "";
    if (!reason) continue;
    const key = reason.toLocaleLowerCase("id-ID");
    const existing = blockerGroups.get(key);
    if (existing) {
      existing.occurrences += 1;
      if (Date.parse(event.occurred_at) > Date.parse(existing.latestAt)) existing.latestAt = event.occurred_at;
    } else {
      blockerGroups.set(key, { reason, occurrences: 1, latestAt: event.occurred_at });
    }
  }

  const menuSummaries = [...menuGroups.entries()].map(([menuId, group]) => {
    const menuDurations = group.batches.map(validDuration).filter((value): value is number => value !== null);
    return {
      menuId,
      menuName: menuById.get(menuId) ?? "Menu tidak ditemukan",
      planCount: group.plans.length,
      plannedPortions: group.plans.reduce((sum, plan) => sum + plan.portion_count, 0),
      batchCount: group.batches.length,
      completedBatches: group.batches.filter((batch) => batch.status === "completed").length,
      blockedBatches: group.batches.filter((batch) => batch.status === "blocked").length,
      estimatedDurationMinutes: (() => {
        const menu = menus.find((item) => item.id === menuId);
        const prep = menu?.prep_duration_minutes;
        const cook = menu?.cook_duration_minutes;
        if (typeof prep !== "number" || typeof cook !== "number") return null;
        if (!Number.isFinite(prep) || !Number.isFinite(cook) || prep < 0 || cook < 0) return null;
        return prep + cook;
      })(),
      averageDurationMinutes: menuDurations.length
        ? Math.round(menuDurations.reduce((sum, value) => sum + value, 0) / menuDurations.length)
        : null,
      durationVarianceMinutes: null,
    };
  }).map((item) => ({
    ...item,
    durationVarianceMinutes: item.estimatedDurationMinutes !== null && item.averageDurationMinutes !== null
      ? item.averageDurationMinutes - item.estimatedDurationMinutes
      : null,
  })).sort((a, b) => b.plannedPortions - a.plannedPortions || a.menuName.localeCompare(b.menuName, "id"));

  return {
    planCount: plans.length,
    plannedPortions: plans.reduce((sum, plan) => sum + plan.portion_count, 0),
    batchCount: relevantBatches.length,
    completedBatches: relevantBatches.filter((batch) => batch.status === "completed").length,
    blockedBatches: relevantBatches.filter((batch) => batch.status === "blocked").length,
    queuedBatches: relevantBatches.filter((batch) => batch.status === "queued").length,
    averageDurationMinutes: durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null,
    menuSummaries,
    blockers: [...blockerGroups.values()].sort((a, b) => b.occurrences - a.occurrences || b.latestAt.localeCompare(a.latestAt)),
  };
}

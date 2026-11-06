import { describe, expect, it } from "vitest";
import { buildProductionReport } from "./production-analytics";

describe("buildProductionReport", () => {
  const plans = [
    { id: "p1", menu_id: "m1", planned_date: "2026-11-06", portion_count: 100, status: "completed" },
    { id: "p2", menu_id: "m1", planned_date: "2026-11-07", portion_count: 50, status: "preparing" },
    { id: "p3", menu_id: "m2", planned_date: "2026-11-07", portion_count: 25, status: "planned" },
  ];
  const menus = [{ id: "m1", name: "Nasi ayam" }, { id: "m2", name: "Sayur bening" }];

  it("summarizes portions, batches, and valid completed durations", () => {
    const report = buildProductionReport(plans, [
      { id: "b1", menu_plan_id: "p1", portion_count: 60, status: "completed", started_at: "2026-11-06T01:00:00Z", completed_at: "2026-11-06T02:00:00Z" },
      { id: "b2", menu_plan_id: "p1", portion_count: 40, status: "completed", started_at: "2026-11-06T01:30:00Z", completed_at: "2026-11-06T03:30:00Z" },
      { id: "b3", menu_plan_id: "p2", portion_count: 50, status: "blocked", started_at: null, completed_at: null },
      { id: "orphan", menu_plan_id: "outside", portion_count: 999, status: "completed", started_at: "2026-11-06T01:00:00Z", completed_at: "2026-11-06T02:00:00Z" },
    ], [], menus);

    expect(report.plannedPortions).toBe(175);
    expect(report.batchCount).toBe(3);
    expect(report.completedBatches).toBe(2);
    expect(report.blockedBatches).toBe(1);
    expect(report.averageDurationMinutes).toBe(90);
    expect(report.menuSummaries[0]).toMatchObject({ menuName: "Nasi ayam", plannedPortions: 150, averageDurationMinutes: 90 });
  });

  it("counts only new blocked transitions and groups repeated reasons", () => {
    const events = [
      { id: 1, batch_id: "b1", action: "UPDATE", occurred_at: "2026-11-06T01:00:00Z", before_data: { status: "preparing" }, after_data: { status: "blocked", blocker_note: "Kompor rusak" } },
      { id: 2, batch_id: "b1", action: "UPDATE", occurred_at: "2026-11-06T01:10:00Z", before_data: { status: "blocked" }, after_data: { status: "blocked", blocker_note: "Kompor rusak" } },
      { id: 3, batch_id: "b2", action: "UPDATE", occurred_at: "2026-11-06T02:00:00Z", before_data: { status: "preparing" }, after_data: { status: "blocked", blocker_note: " kompor rusak " } },
    ];
    const report = buildProductionReport(
      [{ id: "p1", menu_id: "m1", planned_date: "2026-11-06", portion_count: 10, status: "preparing" }],
      [],
      events.map((event) => ({
        ...event,
        before_data: { ...event.before_data, menu_plan_id: "p1" },
        after_data: { ...event.after_data, menu_plan_id: "p1" },
      })),
      []
    );
    expect(report.blockers).toHaveLength(1);
    expect(report.blockers[0]).toMatchObject({ reason: "Kompor rusak", occurrences: 2 });
  });

  it("returns null duration when no valid completed batch exists", () => {
    const report = buildProductionReport([], [
      { id: "b1", menu_plan_id: "missing", portion_count: 1, status: "completed", started_at: "invalid", completed_at: "invalid" },
    ], [], []);
    expect(report.averageDurationMinutes).toBeNull();
  });
});

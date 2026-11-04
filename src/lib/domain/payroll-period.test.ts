import { describe, expect, it } from "vitest";
import { calculatePayrollPeriod } from "./payroll-period";

const multipliers = { present: 1, permission: 0.5, sick: 0.5, absent: 0 };
const volunteers = [
  { id: "v1", full_name: "A", daily_wage: 120, section_name: "DAPUR" },
  { id: "v2", full_name: "B", daily_wage: 100, section_name: "DISTRIBUSI" }
];

describe("calculatePayrollPeriod", () => {
  it("calculates gross wages from actual recorded statuses and budget variance", () => {
    const result = calculatePayrollPeriod(volunteers, [
      { volunteer_id: "v1", work_date: "2026-11-01", status: "present" },
      { volunteer_id: "v1", work_date: "2026-11-02", status: "permission" },
      { volunteer_id: "v2", work_date: "2026-11-01", status: "absent" }
    ], multipliers, 200_000);
    expect(result.lines[0].grossPay).toBe(180_000);
    expect(result.lines[1].grossPay).toBe(0);
    expect(result.total).toBe(180_000);
    expect(result.variance).toBe(20_000);
  });

  it("does not invent attendance for unrecorded days", () => {
    const result = calculatePayrollPeriod(volunteers, [], multipliers, null);
    expect(result.total).toBe(0);
    expect(result.lines.every(line => line.days.present === 0)).toBe(true);
  });

  it("rejects duplicate attendance dates for a volunteer", () => {
    const duplicate = { volunteer_id: "v1", work_date: "2026-11-01", status: "present" as const };
    expect(() => calculatePayrollPeriod(volunteers, [duplicate, duplicate], multipliers, null)).toThrow(/ganda/);
  });

  it("rejects multipliers outside zero to one", () => {
    expect(() => calculatePayrollPeriod(volunteers, [], { ...multipliers, absent: 2 }, null)).toThrow(/pengali/i);
  });
});

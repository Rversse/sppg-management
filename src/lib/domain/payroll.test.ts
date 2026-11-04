import { describe, expect, it } from "vitest";
import { calculatePayroll } from "./payroll";

const policy = {
  payMultiplier: { present: 1, permission: 0.5, sick: 0.5, absent: 0 }
} as const;

describe("calculatePayroll", () => {
  it("returns line-level calculation and budget variance", () => {
    const result = calculatePayroll([
      { volunteerId: "v1", volunteerName: "A", dailyRate: 100_000, attendanceStatus: "present" },
      { volunteerId: "v2", volunteerName: "B", dailyRate: 100_000, attendanceStatus: "permission" }
    ], policy, 250_000);

    expect(result.total).toBe(150_000);
    expect(result.remainingBudget).toBe(100_000);
    expect(result.overBudget).toBe(false);
    expect(result.lines[1].grossPay).toBe(50_000);
  });

  it("rejects duplicate volunteers", () => {
    const row = { volunteerId: "v1", volunteerName: "A", dailyRate: 1, attendanceStatus: "present" as const };
    expect(() => calculatePayroll([row, row], policy)).toThrow(/Duplicate/);
  });
});

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

  it("rejects empty volunteer identifiers", () => {
    expect(() => calculatePayroll([
      { volunteerId: " ", volunteerName: "A", dailyRate: 1, attendanceStatus: "present" }
    ], policy)).toThrow(/ID is required/);
  });

  it("rejects values that exceed safe currency precision", () => {
    expect(() => calculatePayroll([
      { volunteerId: "v1", volunteerName: "A", dailyRate: Number.MAX_VALUE, attendanceStatus: "present" }
    ], policy)).toThrow(/safe currency range/);
    expect(() => calculatePayroll([
      { volunteerId: "v1", volunteerName: "A", dailyRate: Number.MAX_SAFE_INTEGER, attendanceStatus: "present" },
      { volunteerId: "v2", volunteerName: "B", dailyRate: 1, attendanceStatus: "present" }
    ], policy)).toThrow(/Total payroll exceeds/);
  });

  it("rejects budgets outside safe currency precision", () => {
    expect(() => calculatePayroll([], policy, Number.MAX_VALUE)).toThrow(/Budget/);
  });

  it("rejects duplicate volunteers", () => {
    const row = { volunteerId: "v1", volunteerName: "A", dailyRate: 1, attendanceStatus: "present" as const };
    expect(() => calculatePayroll([row, row], policy)).toThrow(/Duplicate/);
  });
});

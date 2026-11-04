import type { AttendanceStatus } from "./attendance";
import type { AttendancePayPolicy } from "./attendance";
import { getAttendancePayMultiplier } from "./attendance";

export interface PayrollInput {
  volunteerId: string;
  volunteerName: string;
  dailyRate: number;
  attendanceStatus: AttendanceStatus;
}

export interface PayrollLine {
  volunteerId: string;
  volunteerName: string;
  dailyRate: number;
  attendanceStatus: AttendanceStatus;
  multiplier: number;
  grossPay: number;
}

export interface PayrollSummary {
  lines: PayrollLine[];
  total: number;
  budget: number | null;
  remainingBudget: number | null;
  overBudget: boolean;
}

export function calculatePayroll(
  inputs: PayrollInput[],
  policy: AttendancePayPolicy,
  budget: number | null = null
): PayrollSummary {
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) {
    throw new Error("Budget must be a non-negative finite number or null.");
  }

  const seen = new Set<string>();
  const lines = inputs.map((input): PayrollLine => {
    if (seen.has(input.volunteerId)) {
      throw new Error(`Duplicate volunteer in payroll input: ${input.volunteerId}`);
    }
    seen.add(input.volunteerId);

    if (!Number.isFinite(input.dailyRate) || input.dailyRate < 0) {
      throw new Error(`Invalid daily rate for volunteer: ${input.volunteerId}`);
    }

    const multiplier = getAttendancePayMultiplier(input.attendanceStatus, policy);
    return {
      volunteerId: input.volunteerId,
      volunteerName: input.volunteerName,
      dailyRate: input.dailyRate,
      attendanceStatus: input.attendanceStatus,
      multiplier,
      grossPay: Math.round(input.dailyRate * multiplier)
    };
  });

  const total = lines.reduce((sum, line) => sum + line.grossPay, 0);
  const remainingBudget = budget === null ? null : budget - total;

  return {
    lines,
    total,
    budget,
    remainingBudget,
    overBudget: remainingBudget !== null && remainingBudget < 0
  };
}

import type { AttendanceStatus } from "./attendance";

export type PayrollMultipliers = Record<AttendanceStatus, number>;

export interface PayrollVolunteer {
  id: string;
  full_name: string;
  daily_wage: number | null;
  section_name: string | null;
}

export interface PayrollAttendance {
  volunteer_id: string;
  work_date: string;
  status: AttendanceStatus;
}

export interface PayrollLine {
  volunteerId: string;
  volunteerName: string;
  sectionName: string;
  dailyWage: number | null;
  days: Record<AttendanceStatus, number>;
  paidDays: number;
  grossPay: number;
  missingDays: number;
}

export interface PayrollCalculation {
  lines: PayrollLine[];
  total: number;
  budget: number | null;
  variance: number | null;
  overBudget: boolean;
  attendanceDaysRecorded: number;
  missingWageCount: number;
}

export function calculatePayrollPeriod(
  volunteers: PayrollVolunteer[],
  attendance: PayrollAttendance[],
  multipliers: PayrollMultipliers,
  budget: number | null
): PayrollCalculation {
  if (budget !== null && (!Number.isSafeInteger(budget) || budget < 0)) {
    throw new Error("Anggaran harus berupa rupiah bulat nol atau lebih.");
  }
  for (const status of ["present", "permission", "sick", "absent"] as const) {
    const value = multipliers[status];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Pengali ${status} harus berada di antara 0 dan 1.`);
    }
  }
  const byVolunteer = new Map<string, PayrollAttendance[]>();
  for (const record of attendance) {
    const list = byVolunteer.get(record.volunteer_id) ?? [];
    list.push(record);
    byVolunteer.set(record.volunteer_id, list);
  }
  const lines = volunteers.map((volunteer): PayrollLine => {
    const days = { present: 0, permission: 0, sick: 0, absent: 0 };
    const seenDates = new Set<string>();
    for (const record of byVolunteer.get(volunteer.id) ?? []) {
      if (seenDates.has(record.work_date)) {
        throw new Error(`Absensi ganda untuk ${volunteer.full_name} pada ${record.work_date}.`);
      }
      seenDates.add(record.work_date);
      days[record.status] += 1;
    }
    const paidDays = (Object.keys(days) as (keyof typeof days)[])
      .reduce((sum, status) => sum + days[status] * multipliers[status], 0);
    const dailyWage = volunteer.daily_wage === null ? null : Math.round(volunteer.daily_wage * 1000);
    return {
      volunteerId: volunteer.id,
      volunteerName: volunteer.full_name,
      sectionName: volunteer.section_name ?? "Belum ditentukan",
      dailyWage,
      days,
      paidDays,
      grossPay: dailyWage === null ? 0 : Math.round(dailyWage * paidDays),
      missingDays: 0
    };
  });
  const total = lines.reduce((sum, line) => sum + line.grossPay, 0);
  const missingWageCount = lines.filter(line => line.dailyWage === null).length;
  const variance = budget === null ? null : budget - total;
  return {
    lines,
    total,
    budget,
    variance,
    overBudget: variance !== null && variance < 0,
    attendanceDaysRecorded: attendance.length,
    missingWageCount
  };
}

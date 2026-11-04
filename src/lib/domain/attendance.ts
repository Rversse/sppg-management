export const ATTENDANCE_STATUSES = ["present", "permission", "sick", "absent"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceRecord {
  id: string;
  volunteerId: string;
  workDate: string;
  status: AttendanceStatus;
  clockIn?: string | null;
  clockOut?: string | null;
  notes?: string | null;
}

export interface AttendancePayPolicy {
  /** Multiplier applied to the configured daily rate for this status. */
  payMultiplier: Record<AttendanceStatus, number>;
}

export function getAttendancePayMultiplier(
  status: AttendanceStatus,
  policy: AttendancePayPolicy
): number {
  const multiplier = policy.payMultiplier[status];
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error(`Invalid pay multiplier for attendance status: ${status}`);
  }
  return multiplier;
}

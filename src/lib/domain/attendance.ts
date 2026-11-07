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

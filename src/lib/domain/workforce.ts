import { z } from "zod";

export const volunteerStatusSchema = z.enum(["active", "inactive"]);

export const volunteerInputSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(160),
  employeeCode: z.string().trim().max(40).optional().or(z.literal("")),
  sectionId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  positionTitle: z.string().trim().max(100).optional().or(z.literal("")),
  dailyRate: z.number().finite().min(0).nullable().optional(),
  status: volunteerStatusSchema.default("active"),
  joinedOn: z.string().date().nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal(""))
});

export type VolunteerInput = z.infer<typeof volunteerInputSchema>;

export interface Volunteer {
  id: string;
  full_name: string;
  employee_code: string | null;
  section_id: string | null;
  phone: string | null;
  position_title: string | null;
  daily_rate: number | null;
  status: "active" | "inactive";
  joined_on: string | null;
  notes: string | null;
}

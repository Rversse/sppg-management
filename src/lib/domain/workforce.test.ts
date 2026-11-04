import { describe, expect, it } from "vitest";
import { volunteerInputSchema } from "./workforce";

describe("volunteerInputSchema", () => {
  it("trims names and defaults status to active", () => {
    const result = volunteerInputSchema.parse({ fullName: "  Siti Aminah  " });
    expect(result.fullName).toBe("Siti Aminah");
    expect(result.status).toBe("active");
  });

  it("rejects names shorter than two characters", () => {
    expect(volunteerInputSchema.safeParse({ fullName: "A" }).success).toBe(false);
  });

  it("rejects negative or non-finite daily rates", () => {
    expect(volunteerInputSchema.safeParse({ fullName: "Siti Aminah", dailyRate: -1 }).success).toBe(false);
    expect(volunteerInputSchema.safeParse({ fullName: "Siti Aminah", dailyRate: Number.NaN }).success).toBe(false);
  });

  it("accepts a null optional section and rate", () => {
    const result = volunteerInputSchema.safeParse({ fullName: "Siti Aminah", sectionId: null, dailyRate: null });
    expect(result.success).toBe(true);
  });

  it("rejects malformed dates and invalid statuses", () => {
    expect(volunteerInputSchema.safeParse({ fullName: "Siti Aminah", joinedOn: "2026-99-40" }).success).toBe(false);
    expect(volunteerInputSchema.safeParse({ fullName: "Siti Aminah", status: "pending" }).success).toBe(false);
  });
});

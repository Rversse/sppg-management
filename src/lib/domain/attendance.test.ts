import { describe, expect, it } from "vitest";
import { getAttendancePayMultiplier } from "./attendance";

describe("getAttendancePayMultiplier", () => {
  it("uses configured policy rather than assuming status treatment", () => {
    const policy = {
      payMultiplier: { present: 1, permission: 0.5, sick: 0.5, absent: 0 }
    } as const;
    expect(getAttendancePayMultiplier("permission", policy)).toBe(0.5);
  });

  it("rejects invalid policy values", () => {
    const policy = {
      payMultiplier: { present: 1, permission: -1, sick: 0, absent: 0 }
    } as const;
    expect(() => getAttendancePayMultiplier("permission", policy)).toThrow();
  });
});

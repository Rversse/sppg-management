import { describe, expect, it } from "vitest";
import { ATTENDANCE_STATUSES } from "./attendance";

describe("attendance statuses", () => {
  it("exposes the supported operational attendance states", () => {
    expect(ATTENDANCE_STATUSES).toEqual(["present", "permission", "sick", "absent"]);
  });
});

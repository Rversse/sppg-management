import { describe, expect, it } from "vitest";
import { volunteersToCsv } from "./workforce-csv";

describe("volunteersToCsv", () => {
  it("exports Indonesian headers, wage in rupiah, and quoted values", () => {
    const csv = volunteersToCsv([{ full_name: "Siti, Aminah", section_name: "Dapur", daily_wage: 75, status: "active", joined_on: "2026-11-01", notes: 'Catatan "khusus"' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Siti, Aminah"');
    expect(csv).toContain('"75000"');
    expect(csv).toContain('"Catatan ""khusus"""');
  });

  it("neutralizes spreadsheet formula injection", () => {
    const csv = volunteersToCsv([{ full_name: "=HYPERLINK(\"https://example.com\")", section_name: "+cmd", daily_wage: null, status: "inactive", joined_on: null, notes: "@SUM(A1:A2)" }]);
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"\'+cmd"');
    expect(csv).toContain('"\'@SUM(A1:A2)"');
  });
});

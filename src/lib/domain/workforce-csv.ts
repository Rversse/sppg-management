export interface VolunteerCsvRow {
  full_name: string;
  section_name: string;
  daily_wage: number | null;
  status: "active" | "inactive";
  joined_on: string | null;
  notes: string | null;
}

function safeCell(value: string | number | null): string {
  const raw = value === null ? "" : String(value);
  const safe = /^[\s]*[=+@\-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function volunteersToCsv(rows: VolunteerCsvRow[]): string {
  const headers = ["Nama lengkap", "Bagian kerja", "Upah harian (Rp)", "Status", "Tanggal bergabung", "Catatan"];
  const body = rows.map((row) => [
    row.full_name,
    row.section_name,
    row.daily_wage === null ? "" : row.daily_wage * 1000,
    row.status === "active" ? "Aktif" : "Nonaktif",
    row.joined_on,
    row.notes
  ].map(safeCell).join(","));
  return "\uFEFF" + [headers.map(safeCell).join(","), ...body].join("\r\n");
}

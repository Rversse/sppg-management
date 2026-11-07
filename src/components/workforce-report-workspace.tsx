"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Person = { id: string; full_name: string; section_id: string | null; daily_wage: number | null; status: "active" | "inactive" };
type Group = { id: string; name: string; section_id: string; start_time: string; end_time: string; weekdays: number[] };
type Version = { group_id: string; group_snapshot: Group; members_snapshot: Person[] };
type Attendance = { volunteer_id: string; work_date: string; status: "present" | "permission" | "sick" | "absent"; clock_in: string | null; clock_out: string | null };
type ReportRow = { date: string; group: string; person: Person; status: Attendance["status"] | "not_recorded"; scheduled: boolean };
const statusLabels = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpa", not_recorded: "Belum dicatat" };
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const dateInZone = (timezone: string) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Jakarta" }).format(new Date());
const csvCell = (value: string | number) => { const raw = String(value); return '"' + (/^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw).replaceAll('"', '""') + '"'; };

export function WorkforceReportWorkspace({ workspaceId, workspaceName, role, timezone }: { workspaceId: string; workspaceName: string; role: string; timezone: string }) {
  const db = useMemo(() => createClient(), []);
  const today = dateInZone(timezone);
  const [from, setFrom] = useState(() => today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [versions, setVersions] = useState<Version[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++request.current;
    if (from > to) { setError("Tanggal awal tidak boleh melewati tanggal akhir."); setLoading(false); return; }
    const span = (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000;
    if (span > 30) { setError("Pilih periode maksimal 31 hari agar laporan tetap ringan."); setLoading(false); return; }
    setLoading(true); setError("");
    const [v, a, s] = await Promise.all([
      db.from("volunteer_schedule_versions").select("group_id,group_snapshot,members_snapshot").eq("workspace_id", workspaceId).lte("valid_from", to).or("valid_to.is.null,valid_to.gte." + from),
      db.from("attendance_records").select("volunteer_id,work_date,status,clock_in,clock_out").eq("workspace_id", workspaceId).gte("work_date", from).lte("work_date", to),
      db.from("sections").select("id,name").eq("workspace_id", workspaceId)
    ]);
    if (sequence !== request.current) return;
    const issue = v.error || a.error || s.error;
    if (issue) setError(issue.message);
    else {
      setVersions((v.data ?? []) as Version[]);
      setAttendance((a.data ?? []) as Attendance[]);
      setSections(Object.fromEntries((s.data ?? []).map((section) => [section.id, section.name])));
    }
    setLoading(false);
  }, [db, workspaceId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    const result: ReportRow[] = [];
    const attendanceMap = new Map(attendance.map((record) => [record.work_date + ":" + record.volunteer_id, record]));
    for (let cursor = Date.parse(from + "T00:00:00Z"); cursor <= Date.parse(to + "T00:00:00Z"); cursor += 86400000) {
      const date = new Date(cursor).toISOString().slice(0, 10);
      const weekday = new Date(cursor).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const activeVersions = versions.filter((version) => version.group_snapshot.weekdays.includes(weekday));
      const scheduled = new Set<string>();
      for (const version of activeVersions) {
        for (const person of version.members_snapshot.filter((member) => member.status === "active")) {
          if (scheduled.has(person.id)) continue;
          scheduled.add(person.id);
          const record = attendanceMap.get(date + ":" + person.id);
          result.push({ date, group: version.group_snapshot.name, person, status: record?.status ?? "not_recorded", scheduled: true });
        }
      }
      for (const record of attendance.filter((item) => item.work_date === date && !scheduled.has(item.volunteer_id))) {
        const person = { id: record.volunteer_id, full_name: "Relawan di luar roster", section_id: null, daily_wage: null, status: "active" as const };
        result.push({ date, group: "Di luar roster", person, status: record.status, scheduled: false });
      }
    }
    return result;
  }, [from, to, versions, attendance]);

  const summary = useMemo(() => {
    const scheduled = rows.filter((row) => row.scheduled);
    return {
      scheduled: scheduled.length,
      present: scheduled.filter((row) => row.status === "present").length,
      permission: scheduled.filter((row) => row.status === "permission").length,
      sick: scheduled.filter((row) => row.status === "sick").length,
      absent: scheduled.filter((row) => row.status === "absent").length,
      unrecorded: scheduled.filter((row) => row.status === "not_recorded").length,
      outside: rows.filter((row) => !row.scheduled).length,
      wage: scheduled.reduce((sum, row) => sum + (row.person.daily_wage ?? 0) * 1000, 0)
    };
  }, [rows]);

  function exportCsv() {
    const headers = ["Tanggal", "Grup", "Nama relawan", "Bagian kerja", "Status absensi", "Upah harian terjadwal (Rp)", "Masuk roster"];
    const body = rows.map((row) => [row.date, row.group, row.person.full_name, row.person.section_id ? sections[row.person.section_id] ?? "" : "", statusLabels[row.status], row.person.daily_wage === null ? "" : row.person.daily_wage * 1000, row.scheduled ? "Ya" : "Tidak"]);
    const csv = "\uFEFF" + [headers, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "laporan-tenaga-kerja-" + from + "-sampai-" + to + ".csv"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[var(--muted)] sm:inline">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce analytics</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Laporan tenaga kerja</h1><p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">Perbandingan roster historis dengan catatan absensi aktual, termasuk upah harian yang dijadwalkan. Laporan tidak menetapkan status absensi sebagai hak pembayaran.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/jadwal-kerja" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Jadwal kerja</Link><Link href="/roster-harian" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Roster harian</Link><Link href="/riwayat-absensi" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Riwayat absensi</Link></div>
      {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"/></label><label className="text-xs text-[var(--muted)]">Sampai tanggal<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm"/></label></div><div className="mt-4 flex flex-wrap justify-between gap-3"><p className="self-center text-xs text-[var(--muted)]">Maksimal 31 hari per laporan · Sabtu dan Minggu tidak dihitung sebagai hari kerja.</p><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm">Muat ulang</button><button onClick={exportCsv} disabled={loading || rows.length === 0} className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Ekspor CSV</button></div></div></section>
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Personel terjadwal" value={summary.scheduled}/><Metric label="Hadir" value={summary.present}/><Metric label="Belum dicatat" value={summary.unrecorded}/><Metric label="Di luar roster" value={summary.outside}/><Metric label="Izin" value={summary.permission}/><Metric label="Sakit" value={summary.sick}/><Metric label="Alpa" value={summary.absent}/><Metric label="Total upah harian terjadwal" value={money(summary.wage)}/></section>
      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--line)] bg-white"><div className="border-b border-[var(--line)] p-4"><h2 className="font-semibold">Rincian harian</h2><p className="mt-1 text-xs text-[var(--muted)]">Upah terjadwal adalah akumulasi tarif harian snapshot untuk setiap hari kerja, bukan nilai pembayaran aktual.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f7f8f6] text-xs text-[var(--muted)]"><tr>{["Tanggal","Grup","Nama relawan","Bagian kerja","Status","Upah harian","Roster"].map((label)=><th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">Memuat laporan...</td></tr>:rows.length===0?<tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">Tidak ada data pada periode ini.</td></tr>:rows.map((row,index)=><tr key={row.date+row.person.id+index} className="border-t border-[var(--line)]"><td className="whitespace-nowrap px-4 py-3">{row.date}</td><td className="px-4 py-3">{row.group}</td><td className="px-4 py-3 font-medium">{row.person.full_name}</td><td className="px-4 py-3">{row.person.section_id?sections[row.person.section_id]??"—":"—"}</td><td className="px-4 py-3">{statusLabels[row.status]}</td><td className="px-4 py-3">{row.person.daily_wage===null?"—":money(row.person.daily_wage*1000)}</td><td className="px-4 py-3">{row.scheduled?"Ya":"Tidak"}</td></tr>)}</tbody></table></div><p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">Menampilkan {rows.length} baris untuk {from} sampai {to}.</p></section>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></article>;
}

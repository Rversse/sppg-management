"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Section = { id: string; name: string };
type AttendanceRow = {
  id: string;
  volunteer_id: string;
  work_date: string;
  status: "present" | "permission" | "sick" | "absent";
  clock_in: string | null;
  clock_out: string | null;
  notes: string | null;
  volunteers: { full_name: string; section_id: string | null } | null;
};
const labels = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpa" };
const field = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";

function localDate(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "Asia/Jakarta" }).format(new Date());
}
function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const safe = /^[\t\r\n ]*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function AttendanceHistoryWorkspace({ workspaceId, workspaceName, role, timezone }: { workspaceId: string; workspaceName: string; role: string; timezone: string }) {
  const supabase = useMemo(() => createClient(), []);
  const today = localDate(timezone);
  const [from, setFrom] = useState(() => today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [sectionId, setSectionId] = useState("all");
  const [status, setStatus] = useState("all");
  const [sections, setSections] = useState<Section[]>([]);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    if (from > to) {
      setError("Tanggal awal tidak boleh melewati tanggal akhir.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const [sectionResult, attendanceResult] = await Promise.all([
      supabase.from("sections").select("id,name").eq("workspace_id", workspaceId).order("name"),
      supabase.from("attendance_records")
        .select("id,volunteer_id,work_date,status,clock_in,clock_out,notes,volunteers!attendance_volunteer_workspace_fk(full_name,section_id)")
        .eq("workspace_id", workspaceId)
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    if (sequence !== loadSequence.current) return;
    if (sectionResult.error || attendanceResult.error) {
      setError(sectionResult.error?.message ?? attendanceResult.error?.message ?? "Gagal memuat riwayat absensi.");
      setRows([]);
    } else {
      setSections(sectionResult.data ?? []);
      setRows((attendanceResult.data ?? []) as unknown as AttendanceRow[]);
    }
    setLoading(false);
  }, [supabase, workspaceId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => rows.filter((row) => {
    const volunteer = row.volunteers;
    return (sectionId === "all" || volunteer?.section_id === sectionId) &&
      (status === "all" || row.status === status);
  }), [rows, sectionId, status]);

  const counts = useMemo(() => visible.reduce((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, { present: 0, permission: 0, sick: 0, absent: 0 }), [visible]);

  function exportCsv() {
    const sectionNames = new Map(sections.map((section) => [section.id, section.name]));
    const header = ["Tanggal", "Nama relawan", "Bagian kerja", "Status", "Jam masuk", "Jam pulang", "Catatan"];
    const body = visible.map((row) => [
      row.work_date,
      row.volunteers?.full_name ?? "Relawan tidak tersedia",
      row.volunteers?.section_id ? sectionNames.get(row.volunteers.section_id) ?? "" : "",
      labels[row.status],
      row.clock_in,
      row.clock_out,
      row.notes,
    ]);
    const csv = "\uFEFF" + [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `riwayat-absensi-${from}-sampai-${to}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[var(--muted)] sm:inline">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce records</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Riwayat absensi</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Telusuri catatan kehadiran berdasarkan periode, bagian kerja, dan status. Data bersumber dari catatan absensi aktual.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/relawan" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Data relawan</Link><Link href="/absensi" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Absensi harian</Link></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2 text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={field}/></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Sampai tanggal<input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className={field}/></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Bagian kerja<select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={field}><option value="all">Semua bagian</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className={field}><option value="all">Semua status</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--muted)]">Maksimal 5.000 catatan per pemuatan. Filter bagian dan status diterapkan pada data periode.</p><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm">Muat ulang</button><button onClick={exportCsv} disabled={loading || visible.length === 0} className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Ekspor CSV</button></div></div>
      </section>
      <section className="mt-5 grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Metric label="Total catatan" value={visible.length}/>
        <Metric label="Hadir" value={counts.present}/>
        <Metric label="Izin" value={counts.permission}/>
        <Metric label="Sakit" value={counts.sick}/>
        <Metric label="Alpa" value={counts.absent}/>
      </section>
      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#f7f8f6] text-xs uppercase text-[var(--muted)]"><tr>{["Tanggal", "Nama relawan", "Bagian kerja", "Status", "Jam masuk", "Jam pulang", "Catatan"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>
          {loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">Memuat riwayat...</td></tr> : visible.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">Tidak ada catatan pada filter yang dipilih.</td></tr> : visible.map((row) => <tr key={row.id} className="border-t border-[var(--line)]"><td className="whitespace-nowrap px-4 py-3">{row.work_date}</td><td className="px-4 py-3 font-medium">{row.volunteers?.full_name ?? "Relawan tidak tersedia"}</td><td className="px-4 py-3">{row.volunteers?.section_id ? sections.find((section) => section.id === row.volunteers?.section_id)?.name ?? "—" : "—"}</td><td className="px-4 py-3">{labels[row.status]}</td><td className="px-4 py-3">{row.clock_in ?? "—"}</td><td className="px-4 py-3">{row.clock_out ?? "—"}</td><td className="max-w-xs px-4 py-3">{row.notes ?? "—"}</td></tr>)}
        </tbody></table></div>
        <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">Menampilkan {visible.length} catatan dalam rentang {from} sampai {to}.</p>
      </section>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>;
}

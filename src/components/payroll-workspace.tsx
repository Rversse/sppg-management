"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculatePayrollPeriod, type PayrollMultipliers } from "@/lib/domain/payroll-period";

type Volunteer = { id: string; full_name: string; daily_wage: number | null; section_id: string | null };
type Attendance = { volunteer_id: string; work_date: string; status: "present" | "permission" | "sick" | "absent" };
const statuses = [
  { key: "present", label: "Hadir" },
  { key: "permission", label: "Izin" },
  { key: "sick", label: "Sakit" },
  { key: "absent", label: "Alpa" }
] as const;
const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const field = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";

export function PayrollWorkspace({ workspaceId, workspaceName, role }: { workspaceId: string; workspaceName: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [start, setStart] = useState(today.slice(0, 8) + "01");
  const [end, setEnd] = useState(today);
  const [budgetText, setBudgetText] = useState("");
  const [multipliers, setMultipliers] = useState<PayrollMultipliers>({ present: 1, permission: 0.5, sick: 0.5, absent: 0 });
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canReview = ["owner", "admin", "finance"].includes(role);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    const [v, s, a] = await Promise.all([
      supabase.from("volunteers").select("id,full_name,daily_wage,section_id").eq("workspace_id", workspaceId).eq("status", "active").order("full_name"),
      supabase.from("sections").select("id,name").eq("workspace_id", workspaceId),
      supabase.from("attendance_records").select("volunteer_id,work_date,status").eq("workspace_id", workspaceId).gte("work_date", start).lte("work_date", end)
    ]);
    const failure = v.error || s.error || a.error;
    if (failure) setError(failure.message);
    else {
      setVolunteers(v.data ?? []);
      setSections(Object.fromEntries((s.data ?? []).map(x => [x.id, x.name])));
      setAttendance((a.data ?? []) as Attendance[]);
    }
    setLoading(false);
  }, [supabase, workspaceId, start, end]);
  useEffect(() => { void load(); }, [load]);

  const budget = budgetText.trim() === "" ? null : Number(budgetText);
  const calculation = useMemo(() => {
    try {
      if (budget !== null && (!Number.isSafeInteger(budget) || budget < 0)) return null;
      return calculatePayrollPeriod(
        volunteers.map(v => ({ ...v, section_name: v.section_id ? sections[v.section_id] ?? null : null })),
        attendance,
        multipliers,
        budget
      );
    } catch { return null; }
  }, [volunteers, sections, attendance, multipliers, budget]);

  const recordedDays = new Set(attendance.map(a => a.work_date)).size;
  const expectedDays = Math.max(0, Math.floor((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86400000) + 1);
  const missingDays = Math.max(0, expectedDays - recordedDays);
  const updateMultiplier = (key: keyof PayrollMultipliers, value: string) => {
    setMultipliers(prev => ({ ...prev, [key]: Number(value) }));
  };

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><span className="text-xs text-[var(--muted)]">{workspaceName} · {role}</span></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Finance operations</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Simulasi gaji</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Hitung estimasi gaji berdasarkan gaji harian dan catatan absensi aktual.</p>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Ini simulasi, belum menjadi payroll resmi dan tidak melakukan pembayaran. Pengali status di bawah adalah nilai awal yang bisa diubah; tetapkan kebijakan resmi sebelum proses persetujuan atau pencairan.
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-semibold">Periode perhitungan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={start} max={end} onChange={e => setStart(e.target.value)} className={field + " mt-2"} /></label>
            <label className="text-xs text-[var(--muted)]">Sampai tanggal<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} className={field + " mt-2"} /></label>
            <label className="text-xs text-[var(--muted)] sm:col-span-2">Anggaran gaji (opsional, rupiah)<input type="number" min="0" step="1000" value={budgetText} onChange={e => setBudgetText(e.target.value)} placeholder="Contoh: 5000000" className={field + " mt-2"} /></label>
          </div>
          <h3 className="mt-6 text-sm font-semibold">Aturan pengali status absensi</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">1 = dibayar penuh · 0,5 = setengah hari · 0 = tidak dibayar.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {statuses.map(s => <label key={s.key} className="text-xs text-[var(--muted)]">{s.label}<input type="number" min="0" max="1" step="0.05" value={multipliers[s.key]} onChange={e => updateMultiplier(s.key, e.target.value)} className={field + " mt-2"} /></label>)}
          </div>
          <button onClick={() => void load()} disabled={loading} className="mt-5 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Memuat..." : "Muat ulang data"}</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Total estimasi" value={calculation ? currency(calculation.total) : "—"} />
          <Metric label="Relawan aktif" value={String(volunteers.length)} />
          <Metric label="Catatan absensi" value={String(attendance.length)} />
          <Metric label="Hari tanpa catatan" value={String(missingDays)} />
          <article className="rounded-xl border border-[var(--line)] bg-white p-5 sm:col-span-2">
            <p className="text-sm text-[var(--muted)]">Posisi terhadap anggaran</p>
            <p className={"mt-2 text-2xl font-semibold " + (calculation?.overBudget ? "text-red-700" : "text-[var(--green)]")}>{calculation?.variance === null || !calculation ? "Anggaran belum diisi" : calculation.overBudget ? "Melebihi " + currency(Math.abs(calculation.variance)) : "Sisa " + currency(calculation.variance)}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Anggaran hanya pembanding. Sistem tidak mengurangi atau mengubah hak gaji untuk memaksakan total agar sesuai anggaran.</p>
          </article>
        </div>
      </section>
      <section className="mt-5 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] p-4"><h2 className="font-semibold">Rincian per relawan</h2><p className="mt-1 text-xs text-[var(--muted)]">Gaji harian × jumlah hari berbobot berdasarkan status absensi.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-[#f7f8f6] text-xs uppercase text-[var(--muted)]"><tr>{["Nama","Bagian","Hadir","Izin","Sakit","Alpa","Gaji harian","Estimasi"].map(x => <th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead>
          <tbody>{loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--muted)]">Memuat data...</td></tr> : !calculation || calculation.lines.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--muted)]">Belum ada data untuk dihitung.</td></tr> : calculation.lines.map(line => <tr key={line.volunteerId} className="border-t border-[var(--line)]"><td className="px-3 py-3 font-medium">{line.volunteerName}</td><td className="px-3 py-3">{line.sectionName}</td><td className="px-3 py-3">{line.days.present}</td><td className="px-3 py-3">{line.days.permission}</td><td className="px-3 py-3">{line.days.sick}</td><td className="px-3 py-3">{line.days.absent}</td><td className="px-3 py-3">{currency(line.dailyWage)}</td><td className="px-3 py-3 font-semibold">{currency(line.grossPay)}</td></tr>)}</tbody>
          <tfoot className="border-t-2 border-[var(--line)] bg-[#fafbf9]"><tr><td colSpan={7} className="px-3 py-4 font-semibold">Total estimasi gaji</td><td className="px-3 py-4 font-semibold">{calculation ? currency(calculation.total) : "—"}</td></tr></tfoot>
        </table></div>
        <p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">{loading ? "Memuat..." : calculation ? `Menghitung ${calculation.lines.length} relawan dari ${attendance.length} catatan absensi.` : "Periksa rentang tanggal dan nilai pengali."}</p>
      </section>
      {!canReview && <p className="mt-4 text-xs text-[var(--muted)]">Akses simulasi keuangan bersifat baca; perubahan aturan dan persetujuan memerlukan role Finance, Admin, atau Owner.</p>}
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-3 text-xl font-semibold">{value}</p></article>;
}

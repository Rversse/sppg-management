"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildProductionReport, type ProductionBatch, type ProductionBatchEvent, type ProductionPlan } from "@/lib/domain/production-analytics";
import { SignOutButton } from "@/components/sign-out-button";

type Menu = { id: string; name: string };
const input = "rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm";
function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function shiftDate(date: string, amount: number) {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}
function csvCell(value: string | number) {
  return '"' + String(value).replaceAll('"', '""') + '"';
}

export function OperationalReportWorkspace({ workspaceId, workspaceName, role, timezone }: { workspaceId: string; workspaceName: string; role: string; timezone: string }) {
  const supabase = useMemo(() => createClient(), []);
  const requestSequence = useRef(0);
  const [from, setFrom] = useState(() => shiftDate(todayInTimezone(timezone), -30));
  const [to, setTo] = useState(() => todayInTimezone(timezone));
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [events, setEvents] = useState<ProductionBatchEvent[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError("");
    const [planResult, menuResult] = await Promise.all([
      supabase.from("menu_plans").select("id,menu_id,planned_date,portion_count,status").eq("workspace_id", workspaceId).gte("planned_date", from).lte("planned_date", to).order("planned_date"),
      supabase.from("menu_items").select("id,name,prep_duration_minutes,cook_duration_minutes").eq("workspace_id", workspaceId).order("name"),
    ]);
    if (requestId !== requestSequence.current) return;
    if (planResult.error || menuResult.error) {
      setError(planResult.error?.message ?? menuResult.error?.message ?? "Gagal memuat laporan operasional.");
      setPlans([]); setBatches([]); setEvents([]); setMenus([]);
      setLoading(false);
      return;
    }
    const nextPlans = (planResult.data ?? []) as ProductionPlan[];
    const nextMenus = (menuResult.data ?? []) as Menu[];
    const ids = nextPlans.map((plan) => plan.id);
    let nextBatches: ProductionBatch[] = [];
    let nextEvents: ProductionBatchEvent[] = [];
    if (ids.length) {
      const [batchResult, eventResult] = await Promise.all([
        supabase.from("production_batches").select("id,menu_plan_id,portion_count,status,started_at,completed_at").eq("workspace_id", workspaceId).in("menu_plan_id", ids),
        supabase.from("production_batch_events").select("id,batch_id,action,occurred_at,before_data,after_data").eq("workspace_id", workspaceId).gte("occurred_at", `${from}T00:00:00+07:00`).lte("occurred_at", `${to}T23:59:59.999+07:00`).order("occurred_at", { ascending: false }),
      ]);
      if (requestId !== requestSequence.current) return;
      if (batchResult.error || eventResult.error) {
        setError(batchResult.error?.message ?? eventResult.error?.message ?? "Gagal memuat riwayat batch.");
        setPlans(nextPlans); setMenus(nextMenus); setBatches([]); setEvents([]);
        setLoading(false);
        return;
      }
      nextBatches = (batchResult.data ?? []) as ProductionBatch[];
      nextEvents = (eventResult.data ?? []) as ProductionBatchEvent[];
    }
    if (requestId !== requestSequence.current) return;
    setPlans(nextPlans); setMenus(nextMenus); setBatches(nextBatches); setEvents(nextEvents);
    setLoading(false);
  }, [supabase, workspaceId, from, to]);

  useEffect(() => { void load(); }, [load, reloadKey]);
  const report = useMemo(() => buildProductionReport(plans, batches, events, menus), [plans, batches, events, menus]);

  function exportCsv() {
    const rows = [
      ["Menu", "Jumlah rencana", "Total porsi", "Jumlah batch", "Batch selesai", "Batch terhambat", "Estimasi menu (menit)", "Rata-rata aktual batch (menit)", "Selisih aktual-estimasi (menit)"],
      ...report.menuSummaries.map((item) => [item.menuName, item.planCount, item.plannedPortions, item.batchCount, item.completedBatches, item.blockedBatches, item.estimatedDurationMinutes ?? "", item.averageDurationMinutes ?? "", item.durationVarianceMinutes ?? ""]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `laporan-produksi-${from}-sd-${to}.csv`;
    anchor.click(); URL.revokeObjectURL(url);
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="text-xs text-[var(--muted)]">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Operational intelligence</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Laporan operasional</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Ringkasan rencana menu, porsi, penyelesaian batch, durasi aktual, dan hambatan produksi berdasarkan catatan yang tersimpan.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <label className="block space-y-1 text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={input + " block"} /></label>
          <label className="block space-y-1 text-xs text-[var(--muted)]">Sampai tanggal<input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} className={input + " block"} /></label>
        </div>
        <div className="flex gap-2"><button onClick={() => setReloadKey((value) => value + 1)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">Muat ulang</button><button onClick={exportCsv} disabled={loading || report.menuSummaries.length === 0} className="rounded-lg bg-[var(--green)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Ekspor CSV</button></div>
      </section>
      {loading ? <p className="mt-6 rounded-xl border border-[var(--line)] bg-white py-14 text-center text-sm text-[var(--muted)]">Memuat laporan...</p> : <>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Rencana menu" value={report.planCount} detail="Dalam rentang tanggal terpilih" />
          <Metric label="Total porsi direncanakan" value={report.plannedPortions.toLocaleString("id-ID")} detail="Akumulasi seluruh rencana menu" />
          <Metric label="Batch produksi" value={report.batchCount} detail={`${report.completedBatches} selesai · ${report.queuedBatches} antre`} />
          <Metric label="Batch terhambat saat ini" value={report.blockedBatches} detail="Status batch terkini" />
          <Metric label="Rata-rata durasi batch" value={formatDuration(report.averageDurationMinutes)} detail="Hanya batch selesai dengan waktu valid" />
          <Metric label="Jenis menu" value={report.menuSummaries.length} detail="Menu yang memiliki rencana" />
        </section>
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Kinerja per menu</h2><p className="mt-1 text-xs text-[var(--muted)]">Perbandingan estimasi persiapan + memasak pada Bank Menu dengan rata-rata durasi batch yang tercatat.</p></div><span className="text-xs text-[var(--muted)]">{from} — {to}</span></div>
          {report.menuSummaries.length === 0 ? <Empty /> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-[var(--line)] text-xs text-[var(--muted)]"><tr><th className="py-3 pr-4 font-medium">Menu</th><th className="py-3 pr-4 font-medium">Rencana</th><th className="py-3 pr-4 font-medium">Porsi</th><th className="py-3 pr-4 font-medium">Batch</th><th className="py-3 pr-4 font-medium">Selesai</th><th className="py-3 pr-4 font-medium">Terhambat</th><th className="py-3 pr-4 font-medium">Estimasi menu</th><th className="py-3 pr-4 font-medium">Aktual batch</th><th className="py-3 font-medium">Selisih</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{report.menuSummaries.map((item) => <tr key={item.menuId}><td className="py-3 pr-4 font-medium">{item.menuName}</td><td className="py-3 pr-4">{item.planCount}</td><td className="py-3 pr-4">{item.plannedPortions.toLocaleString("id-ID")}</td><td className="py-3 pr-4">{item.batchCount}</td><td className="py-3 pr-4">{item.completedBatches}</td><td className="py-3 pr-4">{item.blockedBatches}</td><td className="py-3 pr-4">{formatDuration(item.estimatedDurationMinutes)}</td><td className="py-3 pr-4">{formatDuration(item.averageDurationMinutes)}</td><td className="py-3">{item.durationVarianceMinutes === null ? "—" : `${item.durationVarianceMinutes > 0 ? "+" : ""}${formatDuration(item.durationVarianceMinutes)}`}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-semibold">Riwayat hambatan produksi</h2><p className="mt-1 text-xs text-[var(--muted)]">Dihitung dari transisi batch ke status Terhambat pada riwayat audit.</p>
          {report.blockers.length === 0 ? <Empty text="Belum ada hambatan yang tercatat pada rentang ini." /> : <div className="mt-4 space-y-2">{report.blockers.map((item) => <article key={item.reason.toLocaleLowerCase("id-ID")} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f7f8f6] p-3"><div><p className="text-sm font-medium">{item.reason}</p><p className="mt-1 text-xs text-[var(--muted)]">Terakhir: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(item.latestAt))}</p></div><span className="rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-xs">{item.occurrences} kejadian</span></article>)}</div>}
        </section>
      </>}
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">Durasi aktual dihitung dari waktu mulai hingga selesai batch. Estimasi adalah jumlah durasi persiapan dan memasak pada Bank Menu; perbandingan ini bersifat indikatif karena estimasi resep belum dinormalisasi terhadap jumlah porsi atau ukuran batch. Riwayat hambatan berasal dari audit perubahan status.</p>
    </div>
  </main>;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>;
}
function Empty({ text = "Belum ada data pada rentang tanggal ini." }: { text?: string }) {
  return <p className="mt-4 rounded-lg border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">{text}</p>;
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type AuditRow = {
  id: number;
  entity_type: "volunteer" | "attendance" | "section";
  entity_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  actor_id: string | null;
  occurred_at: string;
};
const entityLabels = { volunteer: "Relawan", attendance: "Absensi", section: "Bagian kerja" };
const actionLabels = { INSERT: "Dibuat", UPDATE: "Diubah", DELETE: "Dihapus" };
const fieldLabels: Record<string, string> = {
  full_name: "Nama", section_id: "Bagian", daily_rate: "Upah harian", daily_wage: "Upah harian",
  status: "Status", joined_on: "Tanggal bergabung", notes: "Catatan", work_date: "Tanggal kerja",
  clock_in: "Jam masuk", clock_out: "Jam pulang", name: "Nama bagian"
};
const field = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function changes(row: AuditRow) {
  const before = row.before_data ?? {};
  const after = row.after_data ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !["id", "workspace_id", "created_at", "updated_at", "created_by", "recorded_by", "updated_by"].includes(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return keys.slice(0, 8).map((key) => ({
    label: fieldLabels[key] ?? key.replaceAll("_", " "),
    before: displayValue(before[key]),
    after: displayValue(after[key])
  }));
}

export function WorkforceAuditWorkspace({ workspaceId, workspaceName, role }: { workspaceId: string; workspaceName: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (from && to && from > to) {
      setError("Tanggal awal tidak boleh melewati tanggal akhir.");
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    let query = supabase.from("workforce_audit_log")
      .select("id,entity_type,entity_id,action,before_data,after_data,actor_id,occurred_at")
      .eq("workspace_id", workspaceId)
      .order("occurred_at", { ascending: false })
      .limit(500);
    if (action !== "all") query = query.eq("action", action);
    if (entity !== "all") query = query.eq("entity_type", entity);
    if (from) query = query.gte("occurred_at", from + "T00:00:00");
    if (to) query = query.lt("occurred_at", new Date(new Date(to + "T00:00:00").getTime() + 86400000).toISOString());
    const result = await query;
    if (request !== sequence.current) return;
    if (result.error) {
      setError(result.error.message);
      setRows([]);
    } else {
      setRows((result.data ?? []) as AuditRow[]);
    }
    setLoading(false);
  }, [supabase, workspaceId, action, entity, from, to]);

  useEffect(() => { void load(); }, [load]);

  if (!["owner", "admin", "hr"].includes(role)) {
    return <main className="min-h-screen bg-[var(--background)] p-8"><div className="mx-auto max-w-3xl rounded-xl border border-[var(--line)] bg-white p-6"><h1 className="text-xl font-semibold">Akses terbatas</h1><p className="mt-2 text-sm text-[var(--muted)]">Riwayat perubahan hanya dapat dilihat oleh owner, admin, dan HR.</p><Link href="/" className="mt-4 inline-block text-sm text-[var(--green)]">Kembali ke dashboard</Link></div></main>;
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[var(--muted)] sm:inline">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Governance & traceability</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit trail</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Riwayat perubahan data relawan, absensi, dan bagian kerja. Catatan bersifat append-only dan tidak dapat diedit dari halaman ini.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/relawan" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Data relawan</Link><Link href="/riwayat-absensi" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">Riwayat absensi</Link></div>
      {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2 text-xs text-[var(--muted)]">Jenis perubahan<select value={action} onChange={(e) => setAction(e.target.value)} className={field}><option value="all">Semua perubahan</option><option value="INSERT">Dibuat</option><option value="UPDATE">Diubah</option><option value="DELETE">Dihapus</option></select></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Jenis data<select value={entity} onChange={(e) => setEntity(e.target.value)} className={field}><option value="all">Semua data</option><option value="volunteer">Relawan</option><option value="attendance">Absensi</option><option value="section">Bagian kerja</option></select></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field}/></label>
          <label className="block space-y-2 text-xs text-[var(--muted)]">Sampai tanggal<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field}/></label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[var(--muted)]">Maksimal 500 perubahan terbaru sesuai filter.</p><button onClick={() => void load()} disabled={loading} className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Muat ulang</button></div>
      </section>
      <section className="mt-5 space-y-3">
        {loading ? <div className="rounded-xl border border-[var(--line)] bg-white p-12 text-center text-sm text-[var(--muted)]">Memuat audit trail...</div> : rows.length === 0 ? <div className="rounded-xl border border-[var(--line)] bg-white p-12 text-center text-sm text-[var(--muted)]">Belum ada perubahan yang sesuai filter.</div> : rows.map((row) => {
          const detail = changes(row);
          return <article key={row.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f1f4f1] px-2.5 py-1 text-xs font-medium">{entityLabels[row.entity_type]}</span><span className="text-sm font-semibold">{actionLabels[row.action]}</span></div><p className="mt-2 text-xs text-[var(--muted)]">ID data: {row.entity_id}</p></div>
              <div className="text-xs text-[var(--muted)] sm:text-right"><p>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(row.occurred_at))}</p><p className="mt-1">Pelaku: {row.actor_id ? row.actor_id.slice(0, 8) + "…" : "Akun tidak tersedia"}</p></div>
            </div>
            {detail.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{detail.map((item) => <div key={item.label} className="rounded-lg bg-[#f8f9f7] p-3 text-xs"><p className="font-semibold capitalize">{item.label}</p><p className="mt-1 break-words text-[var(--muted)]">Sebelum: {item.before}</p><p className="mt-1 break-words">Sesudah: {item.after}</p></div>)}</div>}
            {detail.length === 0 && <p className="mt-3 text-xs text-[var(--muted)]">Tidak ada rincian perubahan yang dapat ditampilkan.</p>}
          </article>;
        })}
      </section>
      <p className="mt-4 text-xs text-[var(--muted)]">Menampilkan {rows.length} catatan. Data audit disimpan oleh trigger database, bukan oleh browser.</p>
    </div>
  </main>;
}

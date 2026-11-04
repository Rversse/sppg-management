"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Menu = { id: string; name: string; status: "draft" | "active" | "archived" };
type Status = "planned" | "preparing" | "ready" | "completed" | "cancelled";
type Plan = { id: string; menu_id: string; planned_date: string; portion_count: number; status: Status; production_notes: string | null };
const statusOptions: { value: Status; label: string }[] = [
  { value: "planned", label: "Terencana" }, { value: "preparing", label: "Diproses" },
  { value: "ready", label: "Siap" }, { value: "completed", label: "Selesai" }, { value: "cancelled", label: "Dibatalkan" }
];
const input = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";
const button = "rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
function todayJakarta() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const v = (k: string) => p.find(x => x.type === k)?.value ?? "";
  return v("year") + "-" + v("month") + "-" + v("day");
}
function addDays(date: string, n: number) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function monday(date: string) { const day = new Date(date + "T12:00:00Z").getUTCDay(); return addDays(date, day === 0 ? -6 : 1 - day); }
function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("id-ID", options).format(new Date(date + "T12:00:00"));
}

export function MenuCalendarWorkspace({ workspaceId, workspaceName, role }: { workspaceId: string; workspaceName: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const canManage = ["owner", "admin", "operations"].includes(role);
  const [selectedDate, setSelectedDate] = useState(todayJakarta);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [menuId, setMenuId] = useState("");
  const [portions, setPortions] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const weekStart = monday(selectedDate);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const menuMap = useMemo(() => new Map(menus.map(m => [m.id, m])), [menus]);
  const dayPlans = plans.filter(p => p.planned_date === selectedDate);
  const totalPortions = dayPlans.filter(p => p.status !== "cancelled").reduce((n, p) => n + p.portion_count, 0);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const start = monday(selectedDate), end = addDays(start, 6);
    const [m, p] = await Promise.all([
      supabase.from("menu_items").select("id,name,status").eq("workspace_id", workspaceId).neq("status", "archived").order("name"),
      supabase.from("menu_plans").select("id,menu_id,planned_date,portion_count,status,production_notes").eq("workspace_id", workspaceId).gte("planned_date", start).lte("planned_date", end).order("planned_date")
    ]);
    if (m.error || p.error) setError(m.error?.message ?? p.error?.message ?? "Gagal memuat kalender.");
    else { setMenus(m.data ?? []); setPlans(p.data ?? []); if (!menuId && m.data?.length) setMenuId(m.data[0].id); }
    setLoading(false);
  }, [supabase, workspaceId, selectedDate, menuId]);
  useEffect(() => { void load(); }, [load]);

  async function createPlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const count = Number(portions);
    if (!menuId || !Number.isInteger(count) || count < 1) { setError("Pilih menu dan jumlah porsi berupa bilangan bulat positif."); return; }
    setBusy(true); setError(""); setNotice("");
    const user = (await supabase.auth.getUser()).data.user;
    const { error: e2 } = await supabase.from("menu_plans").insert({ workspace_id: workspaceId, menu_id: menuId, planned_date: selectedDate, portion_count: count, production_notes: notes.trim() || null, created_by: user?.id ?? null, updated_by: user?.id ?? null });
    if (e2) setError(e2.message); else { setPortions(""); setNotes(""); setNotice("Rencana menu berhasil ditambahkan."); await load(); }
    setBusy(false);
  }
  async function changeStatus(plan: Plan, status: Status) {
    setBusy(true); setError(""); const user = (await supabase.auth.getUser()).data.user;
    const { error: e } = await supabase.from("menu_plans").update({ status, updated_by: user?.id ?? null }).eq("id", plan.id).eq("workspace_id", workspaceId);
    if (e) setError(e.message); else { setNotice("Status produksi diperbarui."); await load(); } setBusy(false);
  }
  async function remove(plan: Plan) {
    if (!window.confirm("Hapus rencana menu ini?")) return;
    setBusy(true); const { error: e } = await supabase.from("menu_plans").delete().eq("id", plan.id).eq("workspace_id", workspaceId);
    if (e) setError(e.message); else { setNotice("Rencana menu dihapus."); await load(); } setBusy(false);
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="text-xs text-[var(--muted)]">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Food operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Kalender menu</h1><p className="mt-2 text-sm text-[var(--muted)]">Rencanakan menu dan jumlah porsi per tanggal. Status menjadi dasar antrean produksi.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <section className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Rencana minggu ini" value={plans.filter(p => p.status !== "cancelled").length} /><Metric label="Menu tanggal dipilih" value={dayPlans.filter(p => p.status !== "cancelled").length} /><Metric label="Total porsi tanggal dipilih" value={totalPortions.toLocaleString("id-ID")} /></section>
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Jadwal mingguan</h2><p className="mt-1 text-xs text-[var(--muted)]">{dateLabel(weekStart, { day: "numeric", month: "long", year: "numeric" })} – {dateLabel(addDays(weekStart, 6), { day: "numeric", month: "long" })}</p></div><div className="flex gap-2"><button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">← Minggu</button><button onClick={() => setSelectedDate(todayJakarta())} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">Hari ini</button><button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">Minggu →</button></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{dates.map(date => { const items = plans.filter(p => p.planned_date === date && p.status !== "cancelled"); return <button key={date} onClick={() => setSelectedDate(date)} className={"min-h-24 rounded-lg border p-3 text-left " + (date === selectedDate ? "border-[var(--green)] bg-[var(--green-soft)]" : "border-[var(--line)] hover:bg-[#fafbf9]")}><span className="block text-xs text-[var(--muted)]">{dateLabel(date, { weekday: "short" })}</span><span className="mt-1 block text-lg font-semibold">{dateLabel(date, { day: "numeric", month: "short" })}</span><span className="mt-2 block text-xs text-[var(--muted)]">{items.length} menu · {items.reduce((n, p) => n + p.portion_count, 0)} porsi</span></button>; })}</div>
      </section>
      <div className="mt-6 grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
        {canManage && <form onSubmit={createPlan} className="h-fit rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-semibold">Tambah rencana menu</h2><p className="mt-1 text-sm text-[var(--muted)]">{dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p><div className="mt-4 space-y-3">
          <label className="block space-y-1.5 text-xs font-medium text-[var(--muted)]">Menu<select required value={menuId} onChange={e => setMenuId(e.target.value)} className={input}><option value="">Pilih menu...</option>{menus.map(m => <option key={m.id} value={m.id}>{m.name}{m.status === "draft" ? " (Draft)" : ""}</option>)}</select></label>
          <label className="block space-y-1.5 text-xs font-medium text-[var(--muted)]">Tanggal<input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={input} /></label>
          <label className="block space-y-1.5 text-xs font-medium text-[var(--muted)]">Jumlah porsi<input required type="number" min="1" step="1" value={portions} onChange={e => setPortions(e.target.value)} className={input} placeholder="Contoh: 2500" /></label>
          <label className="block space-y-1.5 text-xs font-medium text-[var(--muted)]">Catatan operasional<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={input} placeholder="Pembagian batch, kebutuhan khusus, atau catatan persiapan..." /></label>
        </div><button disabled={busy || menus.length === 0} className={button + " mt-4 w-full"}>{busy ? "Menyimpan..." : "Simpan rencana"}</button>{menus.length === 0 && <p className="mt-3 text-xs text-[var(--muted)]">Belum ada menu. Buat menu di <Link className="text-[var(--green)] underline" href="/menu-bank">Bank Menu</Link>.</p>}</form>}
        <section className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Rencana produksi</h2><p className="mt-1 text-sm text-[var(--muted)]">{dateLabel(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div><span className="text-xs text-[var(--muted)]">{dayPlans.length} catatan</span></div>
          {loading ? <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat kalender...</p> : dayPlans.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-[var(--line)] px-4 py-12 text-center text-sm text-[var(--muted)]">Belum ada rencana menu pada tanggal ini.</p> : <div className="mt-4 space-y-3">{dayPlans.map(plan => <article key={plan.id} className="rounded-lg border border-[var(--line)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{menuMap.get(plan.menu_id)?.name ?? "Menu tidak ditemukan"}</h3><p className="mt-1 text-sm text-[var(--muted)]">{plan.portion_count.toLocaleString("id-ID")} porsi · {statusOptions.find(s => s.value === plan.status)?.label}</p></div>{canManage && <div className="flex items-center gap-2"><select disabled={busy} value={plan.status} onChange={e => void changeStatus(plan, e.target.value as Status)} className="rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-xs">{statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select><button disabled={busy} onClick={() => void remove(plan)} className="text-xs text-red-700">Hapus</button></div>}</div>{plan.production_notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{plan.production_notes}</p>}</article>)}</div>}
        </section>
      </div>
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">Rencana menu dan status produksi tersimpan per workspace. Mengubah rencana tidak mengubah komposisi resep di Bank Menu.</p>
    </div>
  </main>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>; }

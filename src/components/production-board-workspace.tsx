"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Status = "planned" | "preparing" | "ready" | "completed" | "cancelled";
type Plan = { id: string; menu_id: string; planned_date: string; portion_count: number; status: Status; production_notes: string | null };
type Menu = { id: string; name: string; description: string | null; prep_duration_minutes: number | null; cook_duration_minutes: number | null; production_notes: string | null };
type Batch = { id: string; menu_plan_id: string; batch_number: number; portion_count: number; status: "queued" | "preparing" | "blocked" | "ready" | "completed" | "cancelled"; assigned_volunteer_id: string | null; blocker_note: string | null; work_notes: string | null; started_at: string | null; completed_at: string | null };
type Volunteer = { id: string; full_name: string; status: "active" | "inactive" };
type Detail = { components: { id: string; item_name: string; category: string; quantity: number | null; unit: string | null; preparation_note: string | null }[]; seasonings: { id: string; ingredient_name: string; quantity: number | null; unit: string | null; preparation_note: string | null }[]; steps: { id: string; step_order: number; title: string; instructions: string; duration_minutes: number | null; critical_note: string | null }[] };
const batchStatuses = [{ value: "queued", label: "Antre" }, { value: "preparing", label: "Dikerjakan" }, { value: "blocked", label: "Terhambat" }, { value: "ready", label: "Siap" }, { value: "completed", label: "Selesai" }, { value: "cancelled", label: "Dibatalkan" }] as const;
const statuses: { value: Status; label: string }[] = [{ value: "planned", label: "Terencana" }, { value: "preparing", label: "Diproses" }, { value: "ready", label: "Siap" }, { value: "completed", label: "Selesai" }, { value: "cancelled", label: "Dibatalkan" }];
const input = "rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm";
function todayJakarta() { const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const v = (k: string) => p.find(x => x.type === k)?.value ?? ""; return v("year") + "-" + v("month") + "-" + v("day"); }
function shift(date: string, n: number) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function label(date: string) { return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date + "T12:00:00")); }

export function ProductionBoardWorkspace({ workspaceId, workspaceName, role }: { workspaceId: string; workspaceName: string; role: string }) {
  const supabase = useMemo(() => createClient(), []);
  const canManage = ["owner", "admin", "operations"].includes(role);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [batchPortions, setBatchPortions] = useState<Record<string, string>>({});
  const [batchAssignees, setBatchAssignees] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [from, setFrom] = useState(() => shift(todayJakarta(), -7));
  const [to, setTo] = useState(() => shift(todayJakarta(), 14));
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const menuMap = useMemo(() => new Map(menus.map(m => [m.id, m])), [menus]);
  const visible = plans.filter(p => filter === "all" ? p.status !== "cancelled" : p.status === filter);
  const remainingPortions = (plan: Plan) => Math.max(0, plan.portion_count - batches.filter(b => b.menu_plan_id === plan.id && b.status !== "cancelled").reduce((sum, b) => sum + b.portion_count, 0));
  const active = plans.filter(p => p.status === "preparing").length;
  const ready = plans.filter(p => p.status === "ready").length;
  const planned = plans.filter(p => p.status === "planned").length;
  const planIds = new Set(plans.map(p => p.id));
  const rangeBatches = batches.filter(b => planIds.has(b.menu_plan_id));
  const queuedBatches = rangeBatches.filter(b => b.status === "queued").length;
  const blockedBatches = rangeBatches.filter(b => b.status === "blocked").length;
  const completedBatches = rangeBatches.filter(b => b.status === "completed").length;

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError("");
    const [p, m, b, v] = await Promise.all([
      supabase.from("menu_plans").select("id,menu_id,planned_date,portion_count,status,production_notes").eq("workspace_id", workspaceId).gte("planned_date", from).lte("planned_date", to).order("planned_date").order("created_at"),
      supabase.from("menu_items").select("id,name,description,prep_duration_minutes,cook_duration_minutes,production_notes").eq("workspace_id", workspaceId),
      supabase.from("production_batches").select("id,menu_plan_id,batch_number,portion_count,status,assigned_volunteer_id,blocker_note,work_notes,started_at,completed_at").eq("workspace_id", workspaceId).order("batch_number"),
      supabase.from("volunteers").select("id,full_name,status").eq("workspace_id", workspaceId).order("full_name")
    ]);
    if (sequence !== loadSequence.current) return;
    if (p.error || m.error || b.error || v.error) setError(p.error?.message ?? m.error?.message ?? b.error?.message ?? v.error?.message ?? "Gagal memuat antrean produksi.");
    else { setPlans(p.data ?? []); setMenus(m.data ?? []); setBatches(b.data ?? []); setVolunteers(v.data ?? []); }
    setLoading(false);
  }, [supabase, workspaceId, from, to]);
  useEffect(() => { void load(); }, [load]);

  async function setStatus(plan: Plan, status: Status) {
    if (status === "completed" && batches.some(b => b.menu_plan_id === plan.id && b.status !== "completed" && b.status !== "cancelled")) {
      setError("Rencana belum dapat diselesaikan karena masih ada batch yang belum selesai atau dibatalkan."); return;
    }
    setBusy(plan.id); setError(""); setNotice("");
    const user = (await supabase.auth.getUser()).data.user;
    const { error: e } = await supabase.from("menu_plans").update({ status, updated_by: user?.id ?? null }).eq("id", plan.id).eq("workspace_id", workspaceId);
    if (e) setError(e.message); else { setNotice("Status produksi diperbarui."); await load(); }
    setBusy("");
  }
  async function createBatch(plan: Plan) {
    const count = Number(batchPortions[plan.id] || remainingPortions(plan));
    if (!Number.isInteger(count) || count < 1 || count > remainingPortions(plan)) { setError("Jumlah porsi batch harus positif dan tidak melebihi sisa porsi rencana."); return; }
    setBusy(plan.id); setError(""); setNotice("");
    const user = (await supabase.auth.getUser()).data.user;
    const nextNumber = Math.max(0, ...batches.filter(b => b.menu_plan_id === plan.id).map(b => b.batch_number)) + 1;
    const { error: e } = await supabase.from("production_batches").insert({
      workspace_id: workspaceId, menu_plan_id: plan.id, batch_number: nextNumber, portion_count: count,
      assigned_volunteer_id: batchAssignees[plan.id] || null, created_by: user?.id ?? null, updated_by: user?.id ?? null
    });
    if (e) setError(e.message); else { setBatchPortions(prev => ({ ...prev, [plan.id]: "" })); setBatchAssignees(prev => ({ ...prev, [plan.id]: "" })); setNotice("Batch produksi ditambahkan."); await load(); }
    setBusy("");
  }

  async function updateBatch(batch: Batch, status: Batch["status"]) {
    let blocker = batch.blocker_note;
    if (status === "blocked") { blocker = window.prompt("Jelaskan hambatan produksi:")?.trim() ?? ""; if (!blocker) return; }
    const user = (await supabase.auth.getUser()).data.user;
    setBusy(batch.id); setError(""); setNotice("");
    const now = new Date().toISOString();
    const patch = { status, blocker_note: status === "blocked" ? blocker : null, started_at: status === "preparing" ? batch.started_at ?? now : batch.started_at, completed_at: status === "completed" ? now : null, updated_by: user?.id ?? null };
    const { error: e } = await supabase.from("production_batches").update(patch).eq("id", batch.id).eq("workspace_id", workspaceId);
    if (e) setError(e.message); else { setNotice("Status batch diperbarui."); await load(); }
    setBusy("");
  }

  async function assignBatch(batch: Batch, volunteerId: string) {
    const user = (await supabase.auth.getUser()).data.user;
    setBusy(batch.id); setError("");
    const { error: e } = await supabase.from("production_batches").update({ assigned_volunteer_id: volunteerId || null, updated_by: user?.id ?? null }).eq("id", batch.id).eq("workspace_id", workspaceId);
    if (e) setError(e.message); else { setNotice("Penanggung jawab batch diperbarui."); await load(); }
    setBusy("");
  }

  async function toggleDetails(plan: Plan) {
    if (expanded === plan.id) { setExpanded(null); return; }
    setExpanded(plan.id);
    if (details[plan.id]) return;
    const [c, s, p] = await Promise.all([
      supabase.from("menu_components").select("id,item_name,category,quantity,unit,preparation_note").eq("workspace_id", workspaceId).eq("menu_id", plan.menu_id).order("sort_order"),
      supabase.from("menu_seasonings").select("id,ingredient_name,quantity,unit,preparation_note").eq("workspace_id", workspaceId).eq("menu_id", plan.menu_id).order("sort_order"),
      supabase.from("menu_production_steps").select("id,step_order,title,instructions,duration_minutes,critical_note").eq("workspace_id", workspaceId).eq("menu_id", plan.menu_id).order("step_order")
    ]);
    if (c.error || s.error || p.error) { setError(c.error?.message ?? s.error?.message ?? p.error?.message ?? "Gagal memuat detail resep."); return; }
    setDetails(prev => ({ ...prev, [plan.id]: { components: c.data ?? [], seasonings: s.data ?? [], steps: p.data ?? [] } }));
  }

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="text-xs text-[var(--muted)]">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Food operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Papan produksi</h1><p className="mt-2 text-sm text-[var(--muted)]">Antrean produksi dari kalender menu, lengkap dengan komposisi resep dan instruksi kerja.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Rencana menunggu" value={planned}/><Metric label="Rencana diproses" value={active}/><Metric label="Rencana siap" value={ready}/><Metric label="Batch antre" value={queuedBatches}/><Metric label="Batch terhambat" value={blockedBatches}/><Metric label="Batch selesai" value={completedBatches}/></section>
      <section className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-4"><div className="flex flex-wrap gap-3"><label className="block space-y-1 text-xs text-[var(--muted)]">Dari tanggal<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className={input+" block"}/></label><label className="block space-y-1 text-xs text-[var(--muted)]">Sampai tanggal<input type="date" min={from} value={to} onChange={e=>setTo(e.target.value)} className={input+" block"}/></label></div><select value={filter} onChange={e=>setFilter(e.target.value as "all"|Status)} className={input}><option value="all">Semua status</option>{statuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></section>
      <section className="mt-6 space-y-3">
        {loading ? <p className="rounded-xl border border-[var(--line)] bg-white py-12 text-center text-sm text-[var(--muted)]">Memuat antrean produksi...</p> : visible.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--line)] bg-white py-14 text-center"><h2 className="font-semibold">Belum ada antrean produksi</h2><p className="mt-2 text-sm text-[var(--muted)]">Buat rencana di <Link href="/kalender-menu" className="text-[var(--green)] underline">Kalender Menu</Link> untuk mulai mengisi papan produksi.</p></div> : visible.map(plan => { const menu = menuMap.get(plan.menu_id); const detail = details[plan.id]; return (<article key={plan.id} className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label(plan.planned_date)}</p><h2 className="mt-1 text-xl font-semibold">{menu?.name ?? "Menu tidak ditemukan"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{plan.portion_count.toLocaleString("id-ID")} porsi{menu?.prep_duration_minutes !== null && menu?.prep_duration_minutes !== undefined ? " · Persiapan "+menu.prep_duration_minutes+" menit" : ""}{menu?.cook_duration_minutes !== null && menu?.cook_duration_minutes !== undefined ? " · Memasak "+menu.cook_duration_minutes+" menit" : ""}</p>{(plan.production_notes || menu?.production_notes) && <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{plan.production_notes || menu?.production_notes}</p>}</div><div className="flex flex-wrap items-center gap-2">{canManage && <select disabled={busy===plan.id} value={plan.status} onChange={e=>void setStatus(plan,e.target.value as Status)} className={input}>{statuses.filter(s=>s.value!=="cancelled").map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>}<button onClick={()=>void toggleDetails(plan)} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">{expanded===plan.id?"Tutup detail":"Lihat instruksi produksi"}</button></div></div>
          {expanded===plan.id && <div>          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Batch produksi</h3><span className="text-xs text-[var(--muted)]">{batches.filter(b=>b.menu_plan_id===plan.id).length} batch · {remainingPortions(plan).toLocaleString("id-ID")} porsi tersisa</span></div>
            {batches.filter(b=>b.menu_plan_id===plan.id).length===0 ? <p className="mt-2 text-sm text-[var(--muted)]">Belum ada batch. Pecah rencana porsi menjadi satu atau beberapa batch kerja.</p> :
              <div className="mt-3 space-y-2">{batches.filter(b=>b.menu_plan_id===plan.id).map(batch=><div key={batch.id} className="rounded-lg border border-[var(--line)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Batch {batch.batch_number} · {batch.portion_count.toLocaleString("id-ID")} porsi</p><p className="mt-1 text-xs text-[var(--muted)]">PIC: {volunteers.find(v=>v.id===batch.assigned_volunteer_id)?.full_name ?? "Belum ditentukan"}</p></div>
                {canManage ? <select disabled={busy===batch.id} value={batch.status} onChange={e=>void updateBatch(batch,e.target.value as Batch["status"])} className={input}>{batchStatuses.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select> : <span className="text-xs">{batchStatuses.find(s=>s.value===batch.status)?.label}</span>}</div>
                {batch.blocker_note && <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">Hambatan: {batch.blocker_note}</p>}
                {batch.work_notes && <p className="mt-2 text-xs text-[var(--muted)]">{batch.work_notes}</p>}
                {canManage && <label className="mt-3 block max-w-sm space-y-1 text-xs text-[var(--muted)]">Penanggung jawab<select disabled={busy===batch.id} value={batch.assigned_volunteer_id??""} onChange={e=>void assignBatch(batch,e.target.value)} className={input+" block w-full"}><option value="">Belum ditentukan</option>{volunteers.filter(v=>v.status==="active").map(v=><option key={v.id} value={v.id}>{v.full_name}</option>)}</select></label>}
              </div>)}</div>}
            {canManage && plan.status!=="cancelled" && plan.status!=="completed" && <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]">
              <label className="space-y-1 text-xs text-[var(--muted)]">Porsi batch<input type="number" min="1" step="1" placeholder={String(remainingPortions(plan))} value={batchPortions[plan.id]??""} onChange={e=>setBatchPortions(prev=>({...prev,[plan.id]:e.target.value}))} className={input+" block w-full"}/></label>
              <label className="space-y-1 text-xs text-[var(--muted)]">Penanggung jawab awal<select value={batchAssignees[plan.id]??""} onChange={e=>setBatchAssignees(prev=>({...prev,[plan.id]:e.target.value}))} className={input+" block w-full"}><option value="">Belum ditentukan</option>{volunteers.filter(v=>v.status==="active").map(v=><option key={v.id} value={v.id}>{v.full_name}</option>)}</select></label>
              <button disabled={busy===plan.id || remainingPortions(plan)===0} onClick={()=>void createBatch(plan)} className="self-end rounded-lg bg-[var(--green)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Tambah batch</button>
            </div>
<div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 lg:grid-cols-3"><DetailList title="Komposisi bahan" empty="Belum ada bahan." items={(detail?.components??[]).map(x=>({id:x.id,title:x.item_name,meta:(x.category||"lainnya")+" · "+(x.quantity??"—")+" "+(x.unit??""),note:x.preparation_note}))}/><DetailList title="Komposisi bumbu" empty="Belum ada bumbu." items={(detail?.seasonings??[]).map(x=>({id:x.id,title:x.ingredient_name,meta:(x.quantity??"—")+" "+(x.unit??""),note:x.preparation_note}))}/><DetailList title="Tahapan produksi" empty="Belum ada tahapan." items={(detail?.steps??[]).map(x=>({id:x.id,title:x.step_order+". "+x.title,meta:x.duration_minutes===null?"Durasi belum ditentukan":x.duration_minutes+" menit",note:x.instructions+(x.critical_note?" · Titik kritis: "+x.critical_note:"")}))}/></div></div>}
        </article>); })}
      </section>
      <p className="mt-6 text-xs leading-5 text-[var(--muted)]">Status produksi merupakan catatan operasional manual. Sistem belum mengklaim proses berjalan otomatis atau memverifikasi produksi fisik.</p>
    </div>
  </main>;
}
function Metric({label,value}:{label:string;value:number}) { return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>; }
function DetailList({title,empty,items}:{title:string;empty:string;items:{id:string;title:string;meta:string;note:string|null}[]}) { return <section><h3 className="font-semibold">{title}</h3>{items.length===0?<p className="mt-2 text-sm text-[var(--muted)]">{empty}</p>:<ul className="mt-2 space-y-2">{items.map(item=><li key={item.id} className="rounded-lg bg-[#f7f8f6] p-3"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.meta}</p>{item.note&&<p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">{item.note}</p>}</li>)}</ul>}</section>; }

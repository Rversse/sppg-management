"use client";
import Link from "next/link";
import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Person={id:string;full_name:string;daily_wage:number|null;status:"active"|"inactive"};
type Group={id:string;name:string;start_time:string;end_time:string;weekdays:number[];notes:string|null};
type Member={group_id:string;volunteer_id:string};
const days=[{n:1,l:"Sen"},{n:2,l:"Sel"},{n:3,l:"Rab"},{n:4,l:"Kam"},{n:5,l:"Jum"}];
const input="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm";
const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export function WorkScheduleWorkspace({workspaceId,workspaceName,role}:{workspaceId:string;workspaceName:string;role:string}){
 const db=useMemo(()=>createClient(),[]);
 const [groups,setGroups]=useState<Group[]>([]),[people,setPeople]=useState<Person[]>([]),[members,setMembers]=useState<Member[]>([]);
 const [name,setName]=useState(""),[start,setStart]=useState("07:00"),[end,setEnd]=useState("15:00"),[selectedDays,setSelectedDays]=useState([1,2,3,4,5]),[notes,setNotes]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const canManage=["owner","admin","hr","operations"].includes(role);
 const weekdayShort=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Jakarta",weekday:"short"}).format(new Date());
 const todayDay=({Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7} as Record<string,number>)[weekdayShort]??6;
 const todayLabel=new Intl.DateTimeFormat("id-ID",{dateStyle:"full",timeZone:"Asia/Jakarta"}).format(new Date());
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [g,p,m]=await Promise.all([
   db.from("volunteer_groups").select("id,name,start_time,end_time,weekdays,notes").eq("workspace_id",workspaceId).order("start_time"),
   db.from("volunteers").select("id,full_name,daily_wage,status").eq("workspace_id",workspaceId).eq("status","active").order("full_name"),
   db.from("volunteer_group_members").select("group_id,volunteer_id").eq("workspace_id",workspaceId)
  ]);
  const e=g.error||p.error||m.error;if(e)setError(e.message);else{setGroups((g.data??[]) as Group[]);setPeople((p.data??[]) as Person[]);setMembers((m.data??[]) as Member[]);}
  setLoading(false);
 },[db,workspaceId]);
 useEffect(()=>{void load();},[load]);
 const personMap=new Map(people.map(p=>[p.id,p]));
 const groupPeople=(id:string)=>members.filter(m=>m.group_id===id).map(m=>personMap.get(m.volunteer_id)).filter((p):p is Person=>Boolean(p));
 const assigned=new Set(members.map(m=>m.volunteer_id));
 const unassigned=people.filter(p=>!assigned.has(p.id));
 const todayGroups=groups.filter(g=>g.weekdays.includes(todayDay));
 const todayTotal=todayGroups.reduce((sum,g)=>sum+groupPeople(g.id).reduce((v,p)=>v+(p.daily_wage??0)*1000,0),0);
 async function createGroup(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  if(start>=end||selectedDays.length===0){setError("Jam selesai harus setelah jam mulai dan pilih minimal satu hari kerja.");setBusy(false);return;}
  const {error:e2}=await db.from("volunteer_groups").insert({workspace_id:workspaceId,name:name.trim(),start_time:start,end_time:end,weekdays:selectedDays,notes:notes.trim()||null});
  if(e2)setError(e2.message);else{setName("");setNotes("");setNotice("Grup kerja berhasil dibuat.");await load();}setBusy(false);
 }
 async function assign(groupId:string,volunteerId:string){
  setBusy(true);setError("");const {error:e}=await db.from("volunteer_group_members").insert({workspace_id:workspaceId,group_id:groupId,volunteer_id:volunteerId});
  if(e)setError(e.message);else{setNotice("Penempatan relawan diperbarui.");await load();}setBusy(false);
 }
 async function unassign(groupId:string,volunteerId:string){
  setBusy(true);const {error:e}=await db.from("volunteer_group_members").delete().eq("workspace_id",workspaceId).eq("group_id",groupId).eq("volunteer_id",volunteerId);
  if(e)setError(e.message);else await load();setBusy(false);
 }
 async function removeGroup(g:Group){
  if(!window.confirm("Hapus grup "+g.name+"? Anggotanya akan menjadi belum ditempatkan."))return;
  setBusy(true);const {error:e}=await db.from("volunteer_groups").delete().eq("workspace_id",workspaceId).eq("id",g.id);
  if(e)setError(e.message);else{setNotice("Grup dihapus.");await load();}setBusy(false);
 }
 return <main className="min-h-screen bg-[var(--background)]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="text-xs text-[var(--muted)]">{workspaceName} · {role}</span><SignOutButton/></div></div></header>
 <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce planning</p><h1 className="mt-2 text-3xl font-semibold">Grup & jadwal kerja</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Atur siapa bekerja dalam grup apa, beserta jam kerja berulang. Sabtu dan Minggu otomatis libur.</p>
 {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
 <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Grup bekerja hari ini" value={String(todayGroups.length)} detail={todayLabel}/><Metric label="Relawan aktif" value={String(people.length)} detail="Personel aktif"/><Metric label="Belum masuk grup" value={String(unassigned.length)} detail={`${assigned.size} penempatan aktif`}/><Metric label="Total gaji harian terjadwal" value={money(todayTotal)} detail="Anggota grup yang bekerja hari ini"/></section>
 {todayDay>=6&&<p className="mt-4 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">Hari ini libur akhir pekan. Tidak ada jadwal kerja rutin.</p>}
 {canManage&&<form onSubmit={createGroup} className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-semibold">Buat grup kerja</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-xs text-[var(--muted)]">Nama grup<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Grup A" className={input+" mt-2"}/></label><label className="text-xs text-[var(--muted)]">Jam mulai<input required type="time" value={start} onChange={e=>setStart(e.target.value)} className={input+" mt-2"}/></label><label className="text-xs text-[var(--muted)]">Jam selesai<input required type="time" value={end} onChange={e=>setEnd(e.target.value)} className={input+" mt-2"}/></label><label className="text-xs text-[var(--muted)]">Catatan<input maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} className={input+" mt-2"}/></label></div><fieldset className="mt-4"><legend className="text-xs font-medium text-[var(--muted)]">Hari kerja berulang</legend><div className="mt-2 flex flex-wrap gap-2">{days.map(d=><label key={d.n} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm"><input type="checkbox" checked={selectedDays.includes(d.n)} onChange={e=>setSelectedDays(old=>e.target.checked?[...old,d.n].sort():old.filter(n=>n!==d.n))}/>{d.l}</label>)}<span className="self-center text-xs text-[var(--muted)]">Sabtu & Minggu libur</span></div></fieldset><button disabled={busy} className="mt-4 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white">{busy?"Menyimpan...":"Simpan grup"}</button></form>}
 <section className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Peta jadwal grup</h2><p className="mt-1 text-xs text-[var(--muted)]">Jadwal berulang setiap minggu sampai diubah.</p></div><button onClick={()=>void load()} disabled={loading||busy} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs">Muat ulang</button></div>
 {loading?<p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm">Memuat...</p>:groups.length===0?<p className="rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">Belum ada grup. Buat Grup A atau pembagian sesuai operasional.</p>:<div className="grid gap-4 xl:grid-cols-2">{groups.map(g=>{const ps=groupPeople(g.id),total=ps.reduce((s,p)=>s+(p.daily_wage??0)*1000,0);return <article key={g.id} className="rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold">{g.name}</h3><p className="mt-1 font-medium text-[var(--green)]">{g.start_time.slice(0,5)}–{g.end_time.slice(0,5)}</p><p className="mt-1 text-xs text-[var(--muted)]">{days.filter(d=>g.weekdays.includes(d.n)).map(d=>d.l).join(", ")} · {ps.length} relawan</p></div><div className="text-right"><p className="text-xs text-[var(--muted)]">Total gaji per hari</p><p className="font-semibold">{money(total)}</p><p className="text-[10px] text-[var(--muted)]">{g.weekdays.includes(todayDay)?"Bekerja hari ini":"Tidak terjadwal hari ini"}</p></div></div>{g.notes&&<p className="mt-2 text-xs text-[var(--muted)]">{g.notes}</p>}<div className="mt-4 space-y-2">{ps.map(p=><div key={p.id} className="flex items-center justify-between rounded-lg bg-[#f7f8f6] px-3 py-2"><div><p className="text-sm font-medium">{p.full_name}</p><p className="text-xs text-[var(--muted)]">{p.daily_wage===null?"Gaji harian belum diisi":money(p.daily_wage*1000)}</p></div>{canManage&&<button disabled={busy} onClick={()=>void unassign(g.id,p.id)} className="text-xs text-red-700">Lepas</button>}</div>)}</div>{canManage&&<div className="mt-3 flex gap-2"><select aria-label={"Tambah relawan ke "+g.name} value="" disabled={busy||unassigned.length===0} onChange={e=>{if(e.target.value)void assign(g.id,e.target.value)}} className={input+" min-w-0 flex-1"}><option value="">Tambah relawan aktif...</option>{unassigned.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select><button disabled={busy} onClick={()=>void removeGroup(g)} className="rounded-lg border border-red-200 px-3 text-xs text-red-700">Hapus grup</button></div>}</article>})}</div>}</section>
 <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-semibold">Belum ditempatkan</h2><p className="mt-1 text-xs text-[var(--muted)]">Relawan aktif yang belum menjadi anggota grup.</p>{unassigned.length===0?<p className="mt-4 text-sm text-[var(--muted)]">Semua relawan aktif sudah ditempatkan.</p>:<div className="mt-3 flex flex-wrap gap-2">{unassigned.map(p=><span key={p.id} className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs">{p.full_name}</span>)}</div>}</section>
 <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Total gaji harian adalah penjumlahan Gaji Harian anggota grup yang dijadwalkan bekerja pada hari tersebut. Ini ringkasan biaya tenaga kerja terjadwal, bukan payroll atau catatan pembayaran. Gaji yang belum diisi tidak dihitung.</p></div></main>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></article>}

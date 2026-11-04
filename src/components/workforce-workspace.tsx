import Link from "next/link";
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Section={id:string;name:string};
type Volunteer={id:string;full_name:string;employee_code:string|null;section_id:string|null;phone:string|null;position_title:string|null;status:"active"|"inactive";daily_rate:number|null;joined_on:string|null;notes:string|null};
type Attendance={volunteer_id:string;status:"present"|"permission"|"sick"|"absent";clock_in:string|null;clock_out:string|null;notes:string|null};
type Props={workspaceId:string;workspaceName:string;role:string};

const statusLabels={present:"Hadir",permission:"Izin",sick:"Sakit",absent:"Alpa"};
const field="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";
const button="inline-flex items-center justify-center rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

export function WorkforceWorkspace({workspaceId,workspaceName,role}:Props){
 const supabase=useMemo(()=>createClient(),[]);
 const [tab,setTab]=useState<"volunteers"|"attendance">("volunteers");
 const [sections,setSections]=useState<Section[]>([]);
 const [volunteers,setVolunteers]=useState<Volunteer[]>([]);
 const [records,setRecords]=useState<Record<string,Attendance>>({});
 const [date,setDate]=useState(()=>new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jakarta"}));
 const [search,setSearch]=useState("");
 const [sectionFilter,setSectionFilter]=useState("all");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [showForm,setShowForm]=useState(false);
 const [editing,setEditing]=useState<Volunteer|null>(null);
 const [form,setForm]=useState({full_name:"",employee_code:"",section_id:"",phone:"",position_title:"",daily_rate:"",joined_on:"",notes:"",status:"active" as "active"|"inactive"});
 const canManage= ["owner","admin","hr"].includes(role);
 const canDelete= ["owner","admin"].includes(role);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [sectionResult,volunteerResult,attendanceResult]=await Promise.all([
   supabase.from("sections").select("id,name").eq("workspace_id",workspaceId).order("sort_order").order("name"),
   supabase.from("volunteers").select("id,full_name,employee_code,section_id,phone,position_title,status,daily_rate,joined_on,notes").eq("workspace_id",workspaceId).order("full_name"),
   supabase.from("attendance_records").select("volunteer_id,status,clock_in,clock_out,notes").eq("workspace_id",workspaceId).eq("work_date",date)
  ]);
  const firstError=sectionResult.error||volunteerResult.error||attendanceResult.error;
  if(firstError){setError(firstError.message);setLoading(false);return;}
  setSections(sectionResult.data??[]);setVolunteers(volunteerResult.data??[]);
  const mapped:Record<string,Attendance>={};
  for(const item of attendanceResult.data??[]) mapped[item.volunteer_id]=item as Attendance;
  setRecords(mapped);setLoading(false);
 },[supabase,workspaceId,date]);

 useEffect(()=>{void load();},[load]);
 const visible=useMemo(()=>volunteers.filter(v=>(v.full_name.toLowerCase().includes(search.toLowerCase())||(v.employee_code??"").toLowerCase().includes(search.toLowerCase()))&&(sectionFilter==="all"||v.section_id===sectionFilter)),[volunteers,search,sectionFilter]);
 const counts=useMemo(()=>({total:volunteers.length,active:volunteers.filter(v=>v.status==="active").length,sections:sections.length}),[volunteers,sections]);
 const attendanceCounts=useMemo(()=>Object.values(records).reduce((acc,r)=>{acc[r.status]=(acc[r.status]??0)+1;return acc;},{present:0,permission:0,sick:0,absent:0} as Record<Attendance["status"],number>),[records]);

 function startCreate(){setEditing(null);setForm({full_name:"",employee_code:"",section_id:"",phone:"",position_title:"",daily_rate:"",joined_on:"",notes:"",status:"active"});setShowForm(true);setError("");setNotice("");}
 function startEdit(v:Volunteer){setEditing(v);setForm({full_name:v.full_name,employee_code:v.employee_code??"",section_id:v.section_id??"",phone:v.phone??"",position_title:v.position_title??"",daily_rate:v.daily_rate===null?"":String(v.daily_rate),joined_on:v.joined_on??"",notes:v.notes??"",status:v.status});setShowForm(true);setError("");setNotice("");}

 async function saveVolunteer(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const name=form.full_name.trim();
  const rate=form.daily_rate.trim()===""?null:Number(form.daily_rate);
  if(name.length<2){setError("Nama relawan minimal 2 karakter.");setBusy(false);return;}
  if(rate!==null&&(!Number.isFinite(rate)||rate<0)){setError("Tarif harian harus berupa angka nol atau lebih.");setBusy(false);return;}
  const payload={workspace_id:workspaceId,full_name:name,employee_code:form.employee_code.trim()||null,section_id:form.section_id||null,phone:form.phone.trim()||null,position_title:form.position_title.trim()||null,daily_rate:rate,joined_on:form.joined_on||null,notes:form.notes.trim()||null,status:form.status};
  const result=editing?await supabase.from("volunteers").update(payload).eq("id",editing.id).eq("workspace_id",workspaceId):await supabase.from("volunteers").insert({...payload,created_by:(await supabase.auth.getUser()).data.user?.id??null});
  if(result.error){setError(result.error.message);setBusy(false);return;}
  setShowForm(false);setNotice(editing?"Data relawan diperbarui.":"Relawan berhasil ditambahkan.");await load();setBusy(false);
 }

 async function deleteVolunteer(v:Volunteer){
  if(!canDelete||!window.confirm("Hapus relawan ini? Riwayat absensinya juga akan terhapus."))return;
  setBusy(true);setError("");const {error:deleteError}=await supabase.from("volunteers").delete().eq("id",v.id).eq("workspace_id",workspaceId);
  if(deleteError)setError(deleteError.message);else{setNotice("Relawan dihapus.");await load();}setBusy(false);
 }

 function setAttendance(id:string,status:Attendance["status"]){
  setRecords(prev=>({...prev,[id]:{volunteer_id:id,status,clock_in:prev[id]?.clock_in??null,clock_out:prev[id]?.clock_out??null,notes:prev[id]?.notes??null}}));
 }
 async function saveAttendance(){
  setBusy(true);setError("");setNotice("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Sesi login berakhir. Masuk kembali.");setBusy(false);return;}
  const rows=volunteers.filter(v=>v.status==="active"&&records[v.id]).map(v=>({workspace_id:workspaceId,volunteer_id:v.id,work_date:date,status:records[v.id].status,clock_in:records[v.id].clock_in,clock_out:records[v.id].clock_out,notes:records[v.id].notes,recorded_by:user.id,updated_by:user.id}));
  if(rows.length===0){setError("Belum ada status absensi yang dipilih.");setBusy(false);return;}
  const {error:saveError}=await supabase.from("attendance_records").upsert(rows,{onConflict:"workspace_id,volunteer_id,work_date"});
  if(saveError)setError(saveError.message);else{setNotice(`${rows.length} catatan absensi berhasil disimpan untuk ${date}.`);await load();}
  setBusy(false);
 }

 async function signOut(){await supabase.auth.signOut();window.location.href="/login";}
 return <main className="min-h-screen bg-[var(--background)]">
  <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[var(--muted)] sm:inline">{workspaceName} · {role}</span><button onClick={signOut} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs">Keluar</button></div></div></header>
  <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
   <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Relawan & absensi</h1><p className="mt-2 text-sm text-[var(--muted)]">Kelola data personel dan pencatatan kehadiran dalam satu alur kerja.</p>
   <div className="mt-6 flex flex-wrap gap-2 border-b border-[var(--line)]">{([{id:"volunteers",label:"Data relawan"},{id:"attendance",label:"Absensi harian"}] as const).map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab===t.id?"border-[var(--green)] text-[var(--green)]":"border-transparent text-[var(--muted)]"}`}>{t.label}</button>)}</div>
   {error&&<p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
   {tab==="volunteers"?<section className="mt-6">
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Total relawan" value={counts.total}/><Metric label="Aktif" value={counts.active}/><Metric label="Bagian kerja" value={counts.sections}/></div>
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau kode..." className={`${field} sm:max-w-sm`}/><div className="flex flex-wrap gap-2"><select value={sectionFilter} onChange={e=>setSectionFilter(e.target.value)} className={field+" sm:w-48"}><option value="all">Semua bagian</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>{canManage&&<button onClick={startCreate} className={button}>+ Tambah relawan</button>}</div></div>
    {showForm&&<form onSubmit={saveVolunteer} className="mt-4 rounded-xl border border-[var(--line)] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editing?"Ubah relawan":"Tambah relawan"}</h2><button type="button" onClick={()=>setShowForm(false)} className="text-sm text-[var(--muted)]">Tutup</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     <Field label="Nama lengkap *"><input required minLength={2} maxLength={160} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className={field}/></Field>
     <Field label="Kode relawan"><input maxLength={40} value={form.employee_code} onChange={e=>setForm({...form,employee_code:e.target.value})} className={field}/></Field>
     <Field label="Bagian kerja"><select value={form.section_id} onChange={e=>setForm({...form,section_id:e.target.value})} className={field}><option value="">Belum ditentukan</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
     <Field label="Nomor telepon"><input maxLength={30} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={field}/></Field>
     <Field label="Jabatan"><input maxLength={100} value={form.position_title} onChange={e=>setForm({...form,position_title:e.target.value})} className={field}/></Field>
     <Field label="Tarif harian (opsional)"><input type="number" min="0" step="0.01" value={form.daily_rate} onChange={e=>setForm({...form,daily_rate:e.target.value})} className={field}/></Field>
     <Field label="Tanggal bergabung"><input type="date" value={form.joined_on} onChange={e=>setForm({...form,joined_on:e.target.value})} className={field}/></Field>
     <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value as "active"|"inactive"})} className={field}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></Field>
     <Field label="Catatan"><input maxLength={2000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={field}/></Field>
    </div><button disabled={busy} className={button+" mt-4"}>{busy?"Menyimpan...":"Simpan relawan"}</button></form>}
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f7f8f6] text-xs uppercase text-[var(--muted)]"><tr>{["Kode","Nama","Bagian / Jabatan","Kontak","Status","Aksi"].map(h=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)]">Memuat data...</td></tr>:visible.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)]">Belum ada relawan. Tambahkan data pertama untuk memulai.</td></tr>:visible.map(v=><tr key={v.id} className="border-t border-[var(--line)]"><td className="px-4 py-3 text-[var(--muted)]">{v.employee_code||"—"}</td><td className="px-4 py-3"><p className="font-medium">{v.full_name}</p><p className="text-xs text-[var(--muted)]">{v.position_title||"Tanpa jabatan"}</p></td><td className="px-4 py-3">{sections.find(s=>s.id===v.section_id)?.name||"Belum ditentukan"}</td><td className="px-4 py-3">{v.phone||"—"}</td><td className="px-4 py-3"><span className="rounded-full bg-[#eef4ef] px-2.5 py-1 text-xs">{v.status==="active"?"Aktif":"Nonaktif"}</span></td><td className="px-4 py-3"><div className="flex gap-2">{canManage&&<button onClick={()=>startEdit(v)} className="text-xs font-medium text-[var(--green)]">Ubah</button>}{canDelete&&<button disabled={busy} onClick={()=>void deleteVolunteer(v)} className="text-xs text-red-700">Hapus</button>}</div></td></tr>)}</tbody></table></div><p className="border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">Menampilkan {visible.length} dari {volunteers.length} relawan.</p></div>
   </section>:<section className="mt-6">
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-white p-4 sm:flex-row sm:items-end sm:justify-between"><div><label htmlFor="work-date" className="block text-xs text-[var(--muted)]">Tanggal kerja</label><input id="work-date" type="date" value={date} onChange={e=>setDate(e.target.value)} className={field+" mt-2 sm:w-52"}/></div><div className="flex flex-wrap gap-2 text-xs">{Object.entries(statusLabels).map(([k,v])=><span key={k} className="rounded-full bg-[#f3f5f2] px-3 py-2">{v}: {attendanceCounts[k as Attendance["status"]]??0}</span>)}</div></div>
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f7f8f6] text-xs uppercase text-[var(--muted)]"><tr><th className="px-4 py-3">Relawan</th><th className="px-4 py-3">Bagian</th><th className="px-4 py-3">Kehadiran</th></tr></thead><tbody>{loading?<tr><td colSpan={3} className="px-4 py-12 text-center">Memuat data...</td></tr>:volunteers.filter(v=>v.status==="active").length===0?<tr><td colSpan={3} className="px-4 py-12 text-center text-[var(--muted)]">Belum ada relawan aktif. Tambahkan relawan terlebih dahulu.</td></tr>:volunteers.filter(v=>v.status==="active").map(v=><tr key={v.id} className="border-t border-[var(--line)]"><td className="px-4 py-3"><p className="font-medium">{v.full_name}</p><p className="text-xs text-[var(--muted)]">{v.employee_code||"Tanpa kode"}</p></td><td className="px-4 py-3">{sections.find(s=>s.id===v.section_id)?.name||"—"}</td><td className="px-4 py-3"><select aria-label={`Status kehadiran ${v.full_name}`} value={records[v.id]?.status??""} onChange={e=>e.target.value&&setAttendance(v.id,e.target.value as Attendance["status"])} className={field+" max-w-48"}><option value="">Belum dicatat</option>{Object.entries(statusLabels).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></td></tr>)}</tbody></table></div><div className="flex flex-col gap-3 border-t border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[var(--muted)]">Penyimpanan menggunakan upsert unik per relawan dan tanggal; penyimpanan ulang memperbarui catatan hari yang sama.</p><button disabled={busy||loading} onClick={()=>void saveAttendance()} className={button}>{busy?"Menyimpan...":"Simpan absensi"}</button></div></div>
   </section>}
  </div>
 </main>;
}

function Metric({label,value}:{label:string;value:number}){return <article className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></article>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2 text-xs font-medium text-[var(--muted)]">{label}{children}</label>}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/sign-out-button";

type Group = { id: string; name: string; section_id: string; start_time: string; end_time: string; weekdays: number[] };
type Section = { id: string; name: string };
type Volunteer = { id: string; full_name: string; section_id: string | null; daily_wage: number | null; status: "active" | "inactive" };
type Member = { group_id: string; volunteer_id: string };
type Attendance = { volunteer_id: string; status: "present" | "permission" | "sick" | "absent"; clock_in: string | null; clock_out: string | null };
type Props = { workspaceId: string; workspaceName: string; role: string };
const statusLabel = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpa" };
const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const currency = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function DailyRosterWorkspace({ workspaceId, workspaceName, role }: Props) {
  const db = useMemo(() => createClient(), []);
  const [date, setDate] = useState(todayJakarta);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [people, setPeople] = useState<Volunteer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const day = new Date(date + "T00:00:00Z").getUTCDay();
  const workDay = day === 0 ? 7 : day;
  const holiday = day === 0 || day === 6;
  const dateLabel = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date(date + "T12:00:00+07:00"));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [g, s, p, m, a] = await Promise.all([
      db.from("volunteer_groups").select("id,name,section_id,start_time,end_time,weekdays").eq("workspace_id", workspaceId).order("start_time"),
      db.from("sections").select("id,name").eq("workspace_id", workspaceId),
      db.from("volunteers").select("id,full_name,section_id,daily_wage,status").eq("workspace_id", workspaceId).eq("status", "active").order("full_name"),
      db.from("volunteer_group_members").select("group_id,volunteer_id").eq("workspace_id", workspaceId),
      db.from("attendance_records").select("volunteer_id,status,clock_in,clock_out").eq("workspace_id", workspaceId).eq("work_date", date)
    ]);
    const issue = g.error || s.error || p.error || m.error || a.error;
    if (issue) setError(issue.message);
    else {
      setGroups((g.data ?? []) as Group[]);
      setSections((s.data ?? []) as Section[]);
      setPeople((p.data ?? []) as Volunteer[]);
      setMembers((m.data ?? []) as Member[]);
      const mapped: Record<string, Attendance> = {};
      for (const row of a.data ?? []) mapped[row.volunteer_id] = row as Attendance;
      setAttendance(mapped);
    }
    setLoading(false);
  }, [db, workspaceId, date]);

  useEffect(() => { void load(); }, [load]);

  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const sectionById = useMemo(() => new Map(sections.map((section) => [section.id, section.name])), [sections]);
  const activeGroups = holiday ? [] : groups.filter((group) => group.weekdays.includes(workDay));
  const scheduledIds = new Set(activeGroups.flatMap((group) => members.filter((member) => member.group_id === group.id).map((member) => member.volunteer_id)));
  const scheduledPeople = [...scheduledIds].map((id) => personById.get(id)).filter((person): person is Volunteer => Boolean(person));
  const recordedScheduled = scheduledPeople.filter((person) => attendance[person.id]);
  const attended = scheduledPeople.filter((person) => attendance[person.id]?.status === "present").length;
  const notRecorded = scheduledPeople.length - recordedScheduled.length;
  const scheduledWage = scheduledPeople.reduce((sum, person) => sum + (person.daily_wage ?? 0) * 1000, 0);
  const attendanceOutsideRoster = people.filter((person) => attendance[person.id] && !scheduledIds.has(person.id));

  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><Link href="/" className="font-semibold text-[var(--green)]">SPPG Management</Link><div className="flex items-center gap-3"><span className="hidden text-xs text-[var(--muted)] sm:inline">{workspaceName} · {role}</span><SignOutButton /></div></div></header>
    <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Daily operations</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Roster harian</h1><p className="mt-2 text-sm text-[var(--muted)]">Bandingkan personel yang dijadwalkan dengan catatan absensi aktual.</p></div><div><label htmlFor="roster-date" className="block text-xs text-[var(--muted)]">Tanggal operasional</label><input id="roster-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm" /></div></div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mt-5 text-sm font-medium">{dateLabel}</p>
      {holiday && <p className="mt-3 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">Hari libur akhir pekan. Tidak ada roster rutin untuk hari ini.</p>}
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Grup terjadwal" value={String(activeGroups.length)} />
        <Metric label="Personel terjadwal" value={String(scheduledPeople.length)} />
        <Metric label="Hadir tercatat" value={String(attended)} />
        <Metric label="Belum ada catatan" value={String(notRecorded)} />
      </section>
      <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Roster per grup</h2><p className="mt-1 text-xs text-[var(--muted)]">Status kehadiran diambil dari modul Absensi, bukan disimpulkan dari jadwal.</p></div><p className="text-sm font-semibold">{currency(scheduledWage)} <span className="font-normal text-[var(--muted)]">gaji harian terjadwal</span></p></div>
        {loading ? <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat roster...</p> : activeGroups.length === 0 ? <p className="py-10 text-center text-sm text-[var(--muted)]">Tidak ada grup yang dijadwalkan pada tanggal ini.</p> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{activeGroups.map((group) => {
          const groupMembers = members.filter((member) => member.group_id === group.id).map((member) => personById.get(member.volunteer_id)).filter((person): person is Volunteer => Boolean(person));
          return <article key={group.id} className="rounded-lg border border-[var(--line)] p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{group.name}</h3><p className="text-xs text-[var(--muted)]">{sectionById.get(group.section_id) ?? "Bagian tidak ditemukan"}</p></div><p className="text-sm font-medium text-[var(--green)]">{group.start_time.slice(0, 5)}–{group.end_time.slice(0, 5)}</p></div>
            {groupMembers.length === 0 ? <p className="mt-3 text-sm text-[var(--muted)]">Belum ada anggota dalam grup ini.</p> : <ul className="mt-3 divide-y divide-[var(--line)]">{groupMembers.map((person) => { const record = attendance[person.id]; return <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><div><p className="text-sm font-medium">{person.full_name}</p><p className="text-xs text-[var(--muted)]">{person.daily_wage === null ? "Gaji harian belum diisi" : currency(person.daily_wage * 1000)}</p></div><span className={"rounded-full px-2.5 py-1 text-xs " + (record ? "bg-[#eef4ef] text-[var(--green)]" : "bg-[#f3f4f2] text-[var(--muted)]")}>{record ? statusLabel[record.status] : "Belum dicatat"}</span></li>; })}</ul>}
          </article>;
        })}</div>}
      </section>
      {attendanceOutsideRoster.length > 0 && <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5"><h2 className="font-semibold">Absensi di luar roster</h2><p className="mt-1 text-xs text-[var(--muted)]">Relawan ini memiliki catatan absensi, tetapi tidak tercantum dalam grup terjadwal pada tanggal yang dipilih.</p><ul className="mt-3 divide-y divide-[var(--line)]">{attendanceOutsideRoster.map((person) => <li key={person.id} className="flex justify-between gap-3 py-2 text-sm"><span>{person.full_name}</span><span className="text-xs text-[var(--muted)]">{statusLabel[attendance[person.id].status]}</span></li>)}</ul></section>}
      <p className="mt-5 text-xs leading-5 text-[var(--muted)]">Ringkasan biaya dihitung dari Gaji Harian personel yang masuk roster. Data absensi hanya menunjukkan catatan aktual dan tidak mengubah jadwal atau perhitungan roster. {notRecorded > 0 ? "Personel berstatus Belum dicatat belum dapat dikategorikan hadir atau tidak hadir." : "Semua personel roster memiliki catatan absensi."}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href="/jadwal-kerja" className="text-[var(--green)] underline">Kelola grup & jadwal</Link><Link href="/absensi" className="text-[var(--green)] underline">Buka absensi</Link></div>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></article>;
}

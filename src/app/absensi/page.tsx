import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCheck, ClipboardCheck, Clock3 } from "lucide-react";

const statuses = [
  { label: "Hadir", detail: "Hadir bekerja" },
  { label: "Izin", detail: "Tidak hadir dengan izin" },
  { label: "Sakit", detail: "Tidak hadir karena sakit" },
  { label: "Alpa", detail: "Tanpa keterangan" }
];

export default function AttendancePage() {
  const today = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date());
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10"><Link href="/" className="text-sm font-medium text-[var(--green)] hover:underline"><ArrowLeft className="mr-2 inline" size={16}/>Dashboard</Link><span className="text-xs text-[var(--muted)]">SPPG Management / Absensi</span></div></header>
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Absensi harian</h1><p className="mt-2 text-sm text-[var(--muted)]">Catat kehadiran per tanggal dan bagian kerja. Perubahan akan memiliki jejak pencatatan.</p>
        <div className="mt-7 flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-[var(--muted)]">Tanggal kerja</p><p className="mt-1 flex items-center gap-2 font-semibold"><CalendarDays size={17} className="text-[var(--green)]"/>{today}</p></div><div className="flex flex-wrap gap-2"><button disabled className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm opacity-50">Pilih tanggal</button><button disabled className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm opacity-50">Bagian kerja</button></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">{statuses.map((s)=><div key={s.label} className="rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-sm font-medium">{s.label}</p><p className="mt-1 text-xs text-[var(--muted)]">{s.detail}</p><p className="mt-3 text-2xl font-semibold">—</p></div>)}</div>
        <section className="mt-6 rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><ClipboardCheck size={18} className="text-[var(--green)]"/><h2 className="font-semibold">Daftar kehadiran</h2></div><div className="mt-4 rounded-lg border border-dashed border-[#d7ded5] bg-[#fafbf9] px-5 py-12 text-center"><Clock3 className="mx-auto text-[var(--muted)]" size={25}/><p className="mt-3 font-medium">Data relawan belum terhubung</p><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[var(--muted)]">Setelah Supabase dikonfigurasi, daftar relawan aktif akan muncul di sini. Input massal, pilih semua, filter bagian, dan status kehadiran akan diaktifkan bersama penyimpanan yang aman.</p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--muted)]">Aturan pembayaran untuk izin, sakit, dan alpa akan mengikuti kebijakan yang dikonfigurasi—belum ditetapkan otomatis.</p><button disabled className="inline-flex items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-medium text-white opacity-50"><CheckCheck size={16}/>Simpan absensi</button></div></section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Filter, Plus, Search, Users } from "lucide-react";

const sampleVolunteers = [
  { code: "SP-001", name: "Data relawan belum terhubung", role: "Hubungkan Supabase untuk memuat data", section: "—", status: "Belum tersedia" }
];

export default function VolunteersPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-sm font-medium text-[var(--green)] hover:underline"><ArrowLeft className="mr-2 inline" size={16}/>Kembali ke dashboard</Link>
          <span className="text-xs text-[var(--muted)]">SPPG Management / Relawan</span>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Workforce</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Data relawan</h1><p className="mt-2 text-sm text-[var(--muted)]">Kelola identitas, bagian kerja, dan status relawan SPPG.</p></div>
          <button disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-medium text-white opacity-50"><Plus size={16}/>Tambah relawan <span className="text-[10px]">(menunggu database)</span></button>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[["Total relawan","Belum tersambung"],["Aktif","—"],["Bagian kerja","—"]].map(([label,value])=><div key={label} className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}
        </div>
        <section className="mt-6 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16}/><input disabled placeholder="Cari nama atau kode relawan" className="w-full rounded-lg border border-[var(--line)] bg-[#fafbf9] py-2.5 pl-9 pr-3 text-sm outline-none opacity-60"/></div>
            <button disabled className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] opacity-60"><Filter size={15}/>Filter bagian</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#f8f9f7] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="px-5 py-3 font-medium">Kode</th><th className="px-5 py-3 font-medium">Relawan</th><th className="px-5 py-3 font-medium">Bagian</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Aksi</th></tr></thead>
              <tbody><tr className="border-t border-[var(--line)]"><td className="px-5 py-5 text-[var(--muted)]">{sampleVolunteers[0].code}</td><td className="px-5 py-5"><p className="font-medium">{sampleVolunteers[0].name}</p><p className="mt-1 text-xs text-[var(--muted)]">{sampleVolunteers[0].role}</p></td><td className="px-5 py-5">{sampleVolunteers[0].section}</td><td className="px-5 py-5"><span className="rounded-full bg-[#f2f3f1] px-2.5 py-1 text-xs text-[var(--muted)]">{sampleVolunteers[0].status}</span></td><td className="px-5 py-5"><span className="text-xs text-[var(--muted)]">Belum ada aksi</span></td></tr></tbody>
            </table>
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4 text-xs text-[var(--muted)]">Tampilan ini belum menampilkan data contoh palsu. Integrasi database dan otorisasi harus selesai sebelum input relawan diaktifkan.</div>
        </section>
        <div className="mt-6 rounded-xl border border-dashed border-[#cbd8cc] bg-[#eef4ef] p-5"><div className="flex gap-3"><Users className="mt-0.5 text-[var(--green)]" size={20}/><div><h2 className="font-semibold">Struktur data siap dikembangkan</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">Skema mendukung kode relawan, nama, kontak, jabatan, bagian kerja, tarif harian opsional, status aktif, tanggal bergabung, dan catatan. Akses tulis dibatasi untuk peran owner, admin, dan HR.</p><Link href="/absensi" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--green)] hover:underline">Lihat modul absensi <ArrowUpRight size={14}/></Link></div></div></div>
      </div>
    </main>
  );
}

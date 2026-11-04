import Link from "next/link";
import {
  Activity, CalendarDays, ChefHat, CircleDollarSign, ClipboardCheck,
  Clock3, Users, Utensils
} from "lucide-react";

const metrics = [
  { label: "Relawan terdaftar", value: "—", detail: "Menunggu koneksi database", icon: Users },
  { label: "Kehadiran hari ini", value: "—", detail: "Belum ada input absensi", icon: ClipboardCheck },
  { label: "Anggaran upah harian", value: "—", detail: "Atur target di konfigurasi payroll", icon: CircleDollarSign },
  { label: "Menu aktif", value: "—", detail: "Bank menu belum diisi", icon: Utensils }
];

const workstreams = [
  { name: "Manajemen relawan", description: "Data personel, jabatan, dan kelompok kerja", status: "Fondasi tersedia", icon: Users, href: "/relawan" },
  { name: "Absensi harian", description: "Input massal, status kehadiran, dan rekap", status: "Fondasi tersedia", icon: ClipboardCheck, href: "/absensi" },
  { name: "Penggajian", description: "Simulasi upah dan kontrol anggaran", status: "Berikutnya", icon: CircleDollarSign, href: "#" },
  { name: "Bank menu & produksi", description: "Komposisi bahan, bumbu, dan catatan proses", status: "Kerangka tersedia", icon: ChefHat, href: "/menu-bank" }
];

function MetricCard({ item }: { item: typeof metrics[number] }) {
  const Icon = item.icon;
  return (
    <article className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--muted)]">{item.label}</p>
        <span className="rounded-lg bg-[#f1f4f0] p-2 text-[var(--green)]"><Icon size={18} /></span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{item.value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{item.detail}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--green)] text-white"><Utensils size={20} /></div>
            <div><p className="font-semibold tracking-tight">SPPG <span className="text-[var(--green)]">Management</span></p><p className="text-xs text-[var(--muted)]">Operations workspace</p></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)] sm:flex"><Activity size={14} /> Sistem fondasi · Development</div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8eee8] text-xs font-semibold text-[var(--green)]">SP</div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--green)]">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pusat operasional</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Pantau relawan, kehadiran, penggajian, dan persiapan produksi dari satu workspace.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)] md:self-auto"><CalendarDays size={16} /> {new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}</div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => <MetricCard key={item.label} item={item} />)}
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-semibold">Area kerja</h2><p className="mt-1 text-xs text-[var(--muted)]">Modul utama dalam pengembangan</p></div>
              <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-medium text-[var(--green)]">4 modul</span>
            </div>
            <div className="mt-5 divide-y divide-[var(--line)]">
              {workstreams.map((item) => { const Icon = item.icon; const row = (
                <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="rounded-lg bg-[#f2f5f1] p-3 text-[var(--green)]"><Icon size={19} /></span>
                  <div className="min-w-0 flex-1"><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{item.description}</p></div>
                  <span className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--muted)]">{item.status}</span>
                </div>
              ); return item.href === "#" ? <div key={item.name} className="opacity-65">{row}</div> : <Link key={item.name} href={item.href} className="block rounded-lg transition-colors hover:bg-[#fafbf9]">{row}</Link>; })}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2"><Clock3 size={17} className="text-[var(--green)]" /><h2 className="font-semibold">Prinsip operasional</h2></div>
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-[#f6f7f4] p-4"><p className="text-sm font-medium">Perhitungan deterministik</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">AI hanya memberi analisis dan rekomendasi. Nilai upah dan hasil payroll harus dapat ditelusuri.</p></div>
              <div className="rounded-lg bg-[#f6f7f4] p-4"><p className="text-sm font-medium">Kebijakan absensi fleksibel</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Perlakuan izin, sakit, dan tanpa keterangan tidak dikunci sebelum kebijakan ditentukan.</p></div>
              <div className="rounded-lg bg-[#f6f7f4] p-4"><p className="text-sm font-medium">AI lokal bersifat opsional</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Operasional inti tetap berjalan tanpa Ollama atau layanan AI cloud.</p></div>
            </div>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[var(--line)] py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>SPPG Management · Standalone platform</span><span>Fondasi awal — data aktual belum terhubung</span>
        </footer>
      </div>
    </main>
  );
}

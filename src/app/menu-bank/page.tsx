import Link from "next/link";
import { ArrowLeft, ChefHat, Clock3, ClipboardList, Leaf, Plus, Search, Soup } from "lucide-react";

const groups = [
  { title: "Sumber protein", detail: "Kategori sumber bahan protein utama", icon: Soup },
  { title: "Protein", detail: "Rincian lauk atau olahan protein", icon: ChefHat },
  { title: "Sayuran", detail: "Komponen sayur dan kebutuhan persiapan", icon: Leaf },
  { title: "Buah", detail: "Komponen buah untuk penyajian", icon: Leaf },
  { title: "Lainnya", detail: "Karbohidrat, pelengkap, dan komponen tambahan", icon: ClipboardList }
];

export default function MenuBankPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-sm font-medium text-[var(--green)] hover:underline"><ArrowLeft className="mr-2 inline" size={16}/>Kembali ke dashboard</Link>
          <span className="text-xs text-[var(--muted)]">SPPG Management / Bank Menu</span>
        </div>
      </header>
      <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Food operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bank menu</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Katalog menu berdasarkan komposisi bahan, racikan bumbu, dan kebutuhan proses produksi. Bukan kalkulator biaya makanan.</p></div>
          <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-medium text-white opacity-50"><Plus size={16}/>Tambah menu <span className="text-[10px]">(database belum aktif)</span></button>
        </div>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Total menu","—"],["Menu aktif","—"],["Rata-rata persiapan","—"],["Langkah produksi","—"]].map(([label,value])=><article key={label} className="rounded-xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">Menunggu data aktual</p></article>)}
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Komposisi menu</h2><p className="mt-1 text-xs text-[var(--muted)]">Kelompok bahan yang dapat dicatat per menu</p></div><div className="relative sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15}/><input disabled placeholder="Cari menu atau bahan" className="w-full rounded-lg border border-[var(--line)] bg-[#fafbf9] py-2 pl-9 pr-3 text-sm opacity-60"/></div></div>
            <div className="mt-5 divide-y divide-[var(--line)]">
              {groups.map(({title,detail,icon:Icon})=><div key={title} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="rounded-lg bg-[#f2f5f1] p-3 text-[var(--green)]"><Icon size={18}/></span><div className="min-w-0 flex-1"><p className="font-medium">{title}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div><span className="text-xs text-[var(--muted)]">Belum diisi</span></div>)}
            </div>
          </div>

          <div className="space-y-5">
            <article className="rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Soup size={18} className="text-[var(--green)]"/><h2 className="font-semibold">Komposisi bumbu</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Catat bahan bumbu, takaran dan satuan, serta catatan persiapan seperti bumbu yang perlu dihaluskan, dimarinasi, atau ditumis lebih dahulu.</p><div className="mt-4 rounded-lg bg-[#f6f7f4] p-4 text-xs leading-5 text-[var(--muted)]">Struktur data mendukung nama bahan, kuantitas opsional, satuan, urutan, dan catatan persiapan.</div></article>
            <article className="rounded-xl border border-[var(--line)] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><Clock3 size={18} className="text-[var(--green)]"/><h2 className="font-semibold">Catatan produksi</h2></div><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Petakan urutan kerja, estimasi durasi tiap langkah, dan pekerjaan yang berpotensi menjadi bottleneck produksi.</p><div className="mt-4 space-y-2"><div className="rounded-lg bg-[#f6f7f4] p-3 text-xs text-[var(--muted)]">Persiapan bahan — durasi dan catatan khusus</div><div className="rounded-lg bg-[#f6f7f4] p-3 text-xs text-[var(--muted)]">Pengolahan — instruksi dan titik kritis</div><div className="rounded-lg bg-[#f6f7f4] p-3 text-xs text-[var(--muted)]">Penyelesaian — pengecekan sebelum distribusi</div></div></article>
          </div>
        </section>
        <div className="mt-6 rounded-xl border border-dashed border-[#cbd8cc] bg-[#eef4ef] p-5"><p className="font-semibold">Status implementasi</p><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Kerangka modul dan skema database sudah disiapkan. Input, pencarian, filter, dan penyimpanan belum diaktifkan karena project Supabase khusus aplikasi ini belum dibuat dan migrasi belum dijalankan.</p></div>
      </div>
    </main>
  );
}

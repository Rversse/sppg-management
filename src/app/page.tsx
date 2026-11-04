import Link from "next/link";
import { Activity, CalendarDays, ChefHat, ClipboardCheck, Users, Clock3 } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, user, workspace, role } = await requireWorkspace();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: workspace.timezone || "Asia/Jakarta",
  }).format(new Date());

  const [volunteers, active, attendance, menus] = await Promise.all([
    supabase.from("volunteers").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
    supabase.from("volunteers").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("status", "active"),
    supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("work_date", today),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).eq("status", "active"),
  ]);

  const failed = [volunteers, active, attendance, menus].find((result) => result.error);
  const cards = [
    { label: "Total relawan", value: volunteers.count ?? 0, detail: `${active.count ?? 0} relawan aktif`, icon: Users },
    { label: "Catatan absensi hari ini", value: attendance.count ?? 0, detail: today, icon: ClipboardCheck },
    { label: "Menu aktif", value: menus.count ?? 0, detail: "Katalog menu produksi", icon: ChefHat },
  ];
  const links = [
    { title: "Relawan & absensi", description: "Kelola personel, bagian kerja, dan pencatatan kehadiran.", href: "/relawan", icon: Users },
    { title: "Bank menu", description: "Komposisi bahan, racikan bumbu, dan langkah produksi.", href: "/menu-bank", icon: ChefHat },
    { title: "Grup & jadwal kerja", description: "Atur grup relawan, jam kerja, hari libur, dan total gaji harian terjadwal.", href: "/jadwal-kerja", icon: Clock3 },
    { title: "Roster harian", description: "Bandingkan personel terjadwal dengan catatan kehadiran aktual.", href: "/roster-harian", icon: ClipboardCheck },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--green)] text-white">S</div>
            <div>
              <p className="font-semibold">SPPG <span className="text-[var(--green)]">Management</span></p>
              <p className="text-xs text-[var(--muted)]">Operations workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{workspace.name}</p>
              <p className="text-xs text-[var(--muted)]">{user.email} · {role}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pusat operasional</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Ringkasan data aktual workspace.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--muted)]">
            <CalendarDays size={16} />
            {new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: workspace.timezone || "Asia/Jakarta" }).format(new Date())}
          </div>
        </section>

        {failed && (
          <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Sebagian ringkasan gagal dimuat: {failed.error?.message}
          </p>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-xl border border-[var(--line)] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--muted)]">{card.label}</p>
                  <span className="rounded-lg bg-[#f1f4f0] p-2 text-[var(--green)]"><Icon size={18} /></span>
                </div>
                <p className="mt-5 text-3xl font-semibold">{card.value}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{card.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="rounded-xl border border-[var(--line)] bg-white p-6 transition-colors hover:border-[#b7c9ba] hover:bg-[#fcfdfb]">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-[var(--green-soft)] p-3 text-[var(--green)]"><Icon size={20} /></span>
                  <div>
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.description}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm font-medium text-[var(--green)]">Buka modul →</p>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 rounded-xl border border-[var(--line)] bg-white p-5">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-[var(--green)]" />
            <h2 className="font-semibold">Status sistem</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Data ditampilkan berdasarkan workspace dan hak akses akun. Modul payroll tidak digunakan. Sistem menampilkan total gaji harian terjadwal berdasarkan grup kerja dan nilai Gaji Harian yang tersimpan.
          </p>
        </section>
        <footer className="mt-8 border-t border-[var(--line)] py-5 text-xs text-[var(--muted)]">
          SPPG Management · Workspace terisolasi dengan Supabase Row Level Security
        </footer>
      </div>
    </main>
  );
}

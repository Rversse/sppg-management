import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type Member = { user_id: string; email: string; role: "owner" | "admin" | "hr" | "finance" | "operations" | "viewer"; joined_at: string };

async function updateRole(formData: FormData) {
  "use server";
  const targetUserId = String(formData.get("user_id") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  const allowed = ["owner", "admin", "hr", "finance", "operations", "viewer"];
  if (!targetUserId || !allowed.includes(nextRole)) redirect("/anggota?error=Input%20tidak%20valid");
  const { supabase } = await requireWorkspace();
  const { error } = await supabase.rpc("update_workspace_member_role", {
    p_target_user_id: targetUserId,
    p_new_role: nextRole as Member["role"],
  });
  if (error) redirect("/anggota?error=" + encodeURIComponent(error.message));
  revalidatePath("/anggota");
  redirect("/anggota?updated=1");
}

const roleLabels: Record<Member["role"], string> = {
  owner: "Owner", admin: "Admin", hr: "SDM / HR", finance: "Keuangan",
  operations: "Operasional", viewer: "Viewer",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const [{ supabase, workspace, role }, params] = await Promise.all([requireWorkspace(), searchParams]);
  if (role !== "owner" && role !== "admin") redirect("/");
  const { data, error } = await supabase.rpc("list_workspace_members");
  const members = (data ?? []) as Member[];
  const canManagePrivileged = role === "owner";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div><Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--green)]">← Kembali ke dashboard</Link><h1 className="mt-2 text-2xl font-semibold">Anggota workspace</h1><p className="mt-1 text-sm text-[var(--muted)]">{workspace.name} · Pengaturan akses</p></div>
          <span className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-xs font-semibold text-[var(--green)]">{role === "owner" ? "Owner" : "Admin"}</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">
        {params.updated && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Role anggota berhasil diperbarui.</p>}
        {params.error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Direktori anggota gagal dimuat: {error.message}</p> : (
          <section className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
            <div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-semibold">Daftar anggota</h2><p className="mt-1 text-sm text-[var(--muted)]">{members.length} akun terhubung ke workspace ini.</p></div>
            <div className="divide-y divide-[var(--line)]">
              {members.map((member) => {
                const canEdit = canManagePrivileged || (member.role !== "owner" && member.role !== "admin");
                const options = canManagePrivileged ? Object.keys(roleLabels) as Member["role"][] : ["hr", "finance", "operations", "viewer"] as Member["role"][];
                return <div key={member.user_id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{member.email}</p><p className="mt-1 text-xs text-[var(--muted)]">Bergabung {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(member.joined_at))}</p></div>
                  <div className="flex items-center gap-2">
                    {!canEdit ? <span className="rounded-lg bg-[#f3f5f2] px-3 py-2 text-sm text-[var(--muted)]">{roleLabels[member.role]}</span> : <form action={updateRole} className="flex items-center gap-2">
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <label className="sr-only" htmlFor={`role-${member.user_id}`}>Role {member.email}</label>
                      <select id={`role-${member.user_id}`} name="role" defaultValue={member.role} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">
                        {options.map((option) => <option key={option} value={option}>{roleLabels[option]}</option>)}
                      </select>
                      <button className="rounded-lg bg-[var(--green)] px-3 py-2 text-sm font-medium text-white hover:opacity-90">Simpan</button>
                    </form>}
                  </div>
                </div>;
              })}
            </div>
            <div className="border-t border-[var(--line)] bg-[#fafbf9] px-5 py-4 text-xs leading-5 text-[var(--muted)]">
              {role === "owner" ? "Owner dapat mengatur seluruh role. Workspace wajib memiliki minimal satu owner." : "Admin hanya dapat mengatur role SDM, keuangan, operasional, dan viewer. Perubahan role owner/admin hanya dapat dilakukan owner."}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

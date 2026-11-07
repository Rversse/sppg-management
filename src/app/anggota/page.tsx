import Link from "next/link";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type Member = { user_id: string; email: string; role: "owner" | "admin" | "hr" | "finance" | "operations" | "viewer"; joined_at: string };

async function createInvitation(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!email || !["admin", "hr", "finance", "operations", "viewer"].includes(role)) redirect("/anggota?error=Data%20undangan%20tidak%20valid");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { supabase, role: actorRole } = await requireWorkspace();
  if (actorRole !== "owner" && actorRole !== "admin") redirect("/");
  const { error } = await supabase.rpc("create_workspace_invitation", {
    p_email: email, p_role: role, p_token_hash: tokenHash,
    p_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) redirect("/anggota?error=" + encodeURIComponent(error.message));
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost";
  redirect("/anggota?invitation=" + encodeURIComponent(origin + "/undangan/" + token));
}

async function revokeInvitation(formData: FormData) {
  "use server";
  const id = String(formData.get("invitation_id") ?? "");
  const { supabase } = await requireWorkspace();
  const { error } = await supabase.rpc("revoke_workspace_invitation", { p_invitation_id: id });
  if (error) redirect("/anggota?error=" + encodeURIComponent(error.message));
  revalidatePath("/anggota");
  redirect("/anggota?revoked=1");
}

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
  searchParams: Promise<{ error?: string; updated?: string; invitation?: string; revoked?: string }>;
}) {
  const [{ supabase, workspace, role }, params] = await Promise.all([requireWorkspace(), searchParams]);
  if (role !== "owner" && role !== "admin") redirect("/");
  const [{ data, error }, { data: invitationsData, error: invitationsError }] = await Promise.all([supabase.rpc("list_workspace_members"), supabase.rpc("list_workspace_invitations")]);
  const invitations = (invitationsData ?? []) as { id: string; email: string; role: Member["role"]; created_at: string; expires_at: string }[];
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
        {params.invitation && <section className="mb-5 rounded-xl border border-[var(--green)] bg-white p-5"><h2 className="font-semibold">Undangan berhasil dibuat</h2><p className="mt-1 text-sm text-[var(--muted)]">Bagikan tautan ini hanya kepada pemilik email yang diundang. Tautan berlaku 7 hari dan hanya dapat dipakai sekali.</p><input readOnly value={params.invitation} className="mt-3 w-full rounded-lg border border-[var(--line)] bg-[#fafbf9] px-3 py-3 text-sm" /><p className="mt-2 text-xs text-[var(--muted)]">Salin tautan untuk dikirim melalui kanal komunikasi Anda. Sistem belum mengirim email otomatis.</p></section>}
        {params.revoked && <p role="status" className="mb-4 rounded-lg bg-[#f3f5f2] p-3 text-sm">Undangan berhasil dibatalkan.</p>}
        {params.updated && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Role anggota berhasil diperbarui.</p>}
        {params.error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
        <section className="mb-6 rounded-xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-semibold">Undang anggota baru</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Undangan terikat ke email penerima, berlaku 7 hari, dan hanya bisa digunakan sekali.</p>
          <form action={createInvitation} className="mt-4 grid gap-3 md:grid-cols-[1fr_190px_auto]">
            <label className="text-sm font-medium">Email penerima<input required type="email" name="email" placeholder="nama@contoh.id" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-medium">Role awal<select name="role" defaultValue="operations" className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 font-normal">{(role === "owner" ? ["admin", "hr", "finance", "operations", "viewer"] : ["hr", "finance", "operations", "viewer"]).map((value) => <option key={value} value={value}>{roleLabels[value as Member["role"]]}</option>)}</select></label>
            <button className="self-end rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-semibold text-white">Buat tautan undangan</button>
          </form>
        </section>
        {invitationsError ? <p className="mb-5 text-sm text-[var(--muted)]">Daftar undangan aktif tidak tersedia.</p> : invitations.length > 0 && <section className="mb-6 overflow-hidden rounded-xl border border-[var(--line)] bg-white"><div className="border-b border-[var(--line)] px-5 py-4"><h2 className="font-semibold">Undangan aktif</h2><p className="mt-1 text-sm text-[var(--muted)]">{invitations.length} tautan menunggu digunakan.</p></div><div className="divide-y divide-[var(--line)]">{invitations.map((invite) => <div key={invite.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{invite.email}</p><p className="text-xs text-[var(--muted)]">{roleLabels[invite.role]} · Berlaku sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(invite.expires_at))}</p></div><form action={revokeInvitation}><input type="hidden" name="invitation_id" value={invite.id}/><button className="text-sm font-medium text-red-700 hover:underline">Batalkan undangan</button></form></div>)}</div></section>}
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

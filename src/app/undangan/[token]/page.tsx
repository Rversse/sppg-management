import Link from "next/link";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function acceptInvitation(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/login?error=Undangan%20tidak%20valid");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/undangan/" + token));
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("accept_workspace_invitation", { p_token_hash: tokenHash });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/login?error=Undangan%20tidak%20valid");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Undangan workspace</p><h1 className="mt-2 text-2xl font-semibold">Masuk untuk melanjutkan</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Masuk menggunakan alamat email yang menerima undangan. Email akun harus sama dengan alamat yang dituju.</p><Link href={"/login?next=" + encodeURIComponent("/undangan/" + token)} className="mt-5 inline-flex rounded-lg bg-[var(--green)] px-4 py-3 text-sm font-semibold text-white">Masuk dengan email</Link></section></main>;
  return <main className="flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-lg rounded-2xl border border-[var(--line)] bg-white p-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Undangan workspace</p><h1 className="mt-2 text-2xl font-semibold">Gabung ke workspace</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Akun aktif: <strong>{user.email}</strong>. Pastikan ini email yang dituju. Undangan hanya dapat digunakan sekali.</p><form action={acceptInvitation}><input type="hidden" name="token" value={token}/><button className="mt-5 w-full rounded-lg bg-[var(--green)] px-4 py-3 text-sm font-semibold text-white">Terima undangan</button></form></section></main>;
}

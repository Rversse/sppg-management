"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email,setEmail]=useState(""); const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState(""); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase=createClient();
      const {error:authError}=await supabase.auth.signInWithOtp({
        email:email.trim().toLowerCase(),
        options:{emailRedirectTo:`${window.location.origin}/auth/callback`,shouldCreateUser:true}
      });
      if(authError) throw authError;
      setMessage("Tautan masuk sudah dikirim. Periksa inbox dan folder spam email Anda.");
    } catch(cause) { setError(cause instanceof Error?cause.message:"Gagal mengirim tautan masuk."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-7 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--green)]">Akses workspace</p>
    <h1 className="mt-2 text-2xl font-semibold tracking-tight">Masuk ke SPPG Management</h1>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Gunakan email untuk menerima tautan masuk sekali pakai.</p>
    <label htmlFor="email" className="mt-6 block text-sm font-medium">Alamat email</label>
    <input id="email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@contoh.id" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-3 outline-none focus:border-[var(--green)]"/>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="mt-3 rounded-lg bg-[var(--green-soft)] p-3 text-sm text-[var(--green)]">{message}</p>}
    <button disabled={busy} className="mt-5 w-full rounded-lg bg-[var(--green)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy?"Mengirim...":"Kirim tautan masuk"}</button>
    <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Akun baru dapat membuat workspace sendiri. Data workspace lain tetap dilindungi Row Level Security.</p>
  </form>;
}

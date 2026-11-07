"use client";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton(){
  async function signOut(){
    const supabase=createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }
  return <button onClick={()=>void signOut()} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-[#f7f8f6]">Keluar</button>;
}

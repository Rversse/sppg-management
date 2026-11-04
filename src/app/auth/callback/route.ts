import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  let safePath = "/";
  if (next && !next.includes("\\") && next.startsWith("/") && !next.startsWith("//")) {
    const candidate = new URL(next, request.nextUrl.origin);
    if (candidate.origin === request.nextUrl.origin) safePath = candidate.pathname + candidate.search + candidate.hash;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safePath, request.nextUrl.origin));
  }
  return NextResponse.redirect(new URL("/login?error=auth_callback", request.nextUrl.origin));
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();
  const code = requestUrl.searchParams.get("code");
  if (code) await supabase.auth.exchangeCodeForSession(code);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=No%20se%20pudo%20iniciar%20sesión.", request.url));
  const { data: existing } = await supabase.from("profiles").select("is_super_admin, status").eq("id", user.id).maybeSingle();
  if (!existing) await supabase.from("profiles").insert({ id: user.id, email: user.email ?? "", is_super_admin: false, status: "active" });
  if (existing?.status === "suspended") { await supabase.auth.signOut(); return NextResponse.redirect(new URL("/login?error=Tu%20cuenta%20está%20suspendida.", request.url)); }
  return NextResponse.redirect(new URL(existing?.is_super_admin ? "/admin-panel" : "/admin/dashboard", request.url));
}

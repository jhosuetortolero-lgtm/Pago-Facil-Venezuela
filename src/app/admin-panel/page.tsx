import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleStoreStatus } from "./actions";
import { BrandLogo } from "@/components/brand-logo";

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user ? await supabase.from("profiles").select("is_super_admin, status").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || !me?.is_super_admin || me.status !== "active") redirect("/admin/dashboard");
  const { data: stores } = await supabase.from("stores").select("id, name, slug, owner_id").order("created_at", { ascending: false });
  const ownerIds = (stores ?? []).map((store) => store.owner_id);
  const { data: profiles } = ownerIds.length ? await supabase.from("profiles").select("id, email, status").in("id", ownerIds) : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const params = await searchParams;
  return <main className="mx-auto max-w-6xl space-y-8 px-6 py-10"><div className="flex items-center gap-5"><BrandLogo className="h-24 w-44" /><div><p className="text-sm font-semibold tracking-wide text-emerald-700">SUPER ADMIN</p><h1 className="mt-2 text-3xl font-semibold">Administración de tiendas</h1></div></div>{params.error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}<div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-4">Tienda</th><th className="p-4">Correo</th><th className="p-4">Estado</th><th className="p-4">Acción</th></tr></thead><tbody>{(stores ?? []).map((store) => { const owner = profileById.get(store.owner_id); const nextStatus = owner?.status === "suspended" ? "active" : "suspended"; return <tr key={store.id} className="border-b last:border-0"><td className="p-4"><p className="font-medium">{store.name}</p><p className="text-slate-500">/{store.slug}</p></td><td className="p-4">{owner?.email ?? "Sin perfil"}</td><td className="p-4"><span className={owner?.status === "suspended" ? "text-red-600" : "text-emerald-700"}>{owner?.status === "suspended" ? "Suspendida" : "Activa"}</span></td><td className="p-4"><form action={toggleStoreStatus}><input type="hidden" name="profile_id" value={store.owner_id} /><input type="hidden" name="status" value={nextStatus} /><button className="rounded-lg border px-3 py-2 font-medium hover:bg-slate-50">{nextStatus === "suspended" ? "Suspender" : "Activar"}</button></form></td></tr>; })}</tbody></table></div></main>;
}

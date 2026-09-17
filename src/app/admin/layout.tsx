import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Box, CheckCircle2, ClipboardList, LogOut, MessageCircle, Settings2, Store } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";
import { signOutMerchant } from "./actions";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: store } = await supabase.from("stores").select("onboarding_status").eq("owner_id", user.id).maybeSingle();
  const storeIsActive = store?.onboarding_status === "active";
  const base = "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-white/10";
  const nav = <nav className="space-y-1" aria-label="Navegación del comerciante">
    <Link href="/admin/dashboard" className={`${base} bg-slate-950 text-white shadow-sm hover:bg-emerald-700`}><BarChart3 className="h-4 w-4" /> Resumen</Link>
    <Link href="/admin/products" className={base}><Box className="h-4 w-4" /> Productos</Link>
    <Link href="/admin/orders" className={base}><ClipboardList className="h-4 w-4" /> Ventas / Pedidos</Link>
    <Link href="/admin/whatsapp" className={base}><MessageCircle className="h-4 w-4" /> WhatsApp / WAHA</Link>
    <Link href="/admin/dashboard?section=settings#configuracion" className={base}><Settings2 className="h-4 w-4" /> Configuración</Link>
  </nav>;
  return <div className="pf-corporate-background min-h-screen text-slate-950 dark:bg-slate-950 dark:text-white">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex dark:border-white/10 dark:bg-slate-900">
      <Link href="/admin/dashboard" className="mb-10 px-3"><BrandLogo className="h-20 w-52" priority /></Link>
      <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30"><div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${storeIsActive ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}><CheckCircle2 className="h-4 w-4" /> {storeIsActive ? "Tienda activa" : "Configuración pendiente"}</div><p className="mt-2 truncate text-sm text-emerald-950 dark:text-emerald-100">{user.email}</p></div>
      {nav}
      <div className="mt-auto space-y-3 border-t border-slate-100 pt-5 dark:border-white/10"><Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500 hover:text-emerald-700"><Store className="h-4 w-4" /> Mi tienda</Link><form action={signOutMerchant}><button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /> Cerrar sesión</button></form></div>
    </aside>
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:hidden dark:border-white/10 dark:bg-slate-900/90"><BrandLogo className="h-10 w-28" priority /><div className="flex items-center gap-1"><Link href="/admin/dashboard" aria-label="Resumen" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><BarChart3 className="h-5 w-5" /></Link><Link href="/admin/products" aria-label="Productos" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Box className="h-5 w-5" /></Link><Link href="/admin/orders" aria-label="Ventas y pedidos" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ClipboardList className="h-5 w-5" /></Link><Link href="/admin/whatsapp" aria-label="WhatsApp / WAHA" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><MessageCircle className="h-5 w-5" /></Link><Link href="/admin/dashboard?section=settings#configuracion" aria-label="Configuración" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Settings2 className="h-5 w-5" /></Link><form action={signOutMerchant}><button aria-label="Cerrar sesión" className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><LogOut className="h-5 w-5" /></button></form></div></header>
    <div className="lg:pl-72">{children}</div>
  </div>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Box, CheckCircle2, ChevronRight, ClipboardList, CircleHelp, LogOut, Menu, MessageCircle, Settings2, X } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

type Props = { children: React.ReactNode; email: string; storeIsActive: boolean; signOut: (formData: FormData) => void | Promise<void> };

const nav = [
  { href: "/admin/dashboard", label: "Resumen", icon: BarChart3 },
  { href: "/admin/products", label: "Productos", icon: Box },
  { href: "/admin/orders", label: "Ventas", icon: ClipboardList },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/dashboard?section=settings#configuracion", label: "Configuración", icon: Settings2 },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className="space-y-1" aria-label="Navegación del comerciante">
    {nav.map(({ href, label, icon: Icon }) => {
      const active = href.startsWith("/admin/dashboard") ? pathname === "/admin/dashboard" : pathname.startsWith(href);
      return <Link key={href} href={href} onClick={onNavigate} className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" /> <span className="flex-1">{label}</span>{active ? <ChevronRight className="h-4 w-4" /> : null}</Link>;
    })}
  </nav>;
}

export function MerchantShell({ children, email, storeIsActive, signOut }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const title = pathname === "/admin/products" ? "Productos" : pathname === "/admin/orders" ? "Ventas y pedidos" : pathname === "/admin/whatsapp" ? "Conexión de WhatsApp" : "Resumen";
  return <div className="pf-corporate-background min-h-screen text-slate-950 dark:bg-slate-950 dark:text-white">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[#020817] px-4 py-6 lg:flex">
      <Link href="/admin/dashboard" className="mb-8 flex justify-center px-5"><BrandLogo className="h-[76px] w-[180px] brightness-0 invert" priority /></Link>
      <div className="mb-7 rounded-2xl border border-white/10 bg-white/[0.05] p-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950">PF</span><div className="min-w-0"><p className="truncate text-sm font-bold text-white">PagoFácil</p><p className="truncate text-xs text-slate-400">Panel del comerciante</p></div></div></div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Principal</p>
      <Navigation />
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-300"><span className={`h-2 w-2 rounded-full ${storeIsActive ? "bg-emerald-400" : "bg-amber-400"}`} /> {storeIsActive ? "Tienda activa" : "Configuración pendiente"}</div><p className="mt-2 truncate text-xs text-slate-500">{email}</p></div>
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4"><Link href="/admin/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"><CircleHelp className="h-4 w-4" /> Ayuda</Link><form action={signOut}><button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-4 w-4" /> Cerrar sesión</button></form></div>
    </aside>
    {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/60" /><aside className="relative h-full w-[280px] bg-[#020817] px-4 py-6 text-white shadow-2xl"><button type="button" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="absolute right-4 top-5 rounded-lg p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button><Link href="/admin/dashboard" className="mb-10 flex justify-center px-5"><BrandLogo className="h-16 w-40 brightness-0 invert" priority /></Link><Navigation onNavigate={() => setMobileOpen(false)} /></aside></div> : null}
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur lg:ml-[260px] lg:px-8 dark:border-white/10 dark:bg-slate-900/90"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menú" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Panel del comerciante</p><h1 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h1></div></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sistema operativo</div><div className="hidden h-7 w-px bg-slate-200 sm:block dark:bg-white/10" /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">{email.slice(0, 1).toUpperCase()}</div></div></header>
    <div className="lg:ml-[260px]">{children}</div>
  </div>;
}

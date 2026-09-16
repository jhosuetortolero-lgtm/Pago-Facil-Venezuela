import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white"><header className="border-b bg-white dark:border-white/10 dark:bg-slate-900"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3"><BrandLogo className="h-16 w-40" priority /><nav className="flex gap-5 text-sm"><Link href="/admin/dashboard" className="hover:text-emerald-700 dark:hover:text-emerald-400">Resumen</Link><Link href="/admin/products" className="hover:text-emerald-700 dark:hover:text-emerald-400">Productos</Link></nav></div></header>{children}</div>;
}

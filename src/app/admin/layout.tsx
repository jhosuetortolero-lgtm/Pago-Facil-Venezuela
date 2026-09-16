import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="min-h-screen bg-slate-50 text-slate-950"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><span className="font-bold tracking-wide text-emerald-700">PAGOFÁCIL</span><nav className="flex gap-5 text-sm"><Link href="/admin/dashboard" className="hover:text-emerald-700">Resumen</Link><Link href="/admin/products" className="hover:text-emerald-700">Productos</Link></nav></div></header>{children}</div>;
}

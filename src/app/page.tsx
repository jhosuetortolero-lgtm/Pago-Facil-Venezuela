import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 text-center text-slate-950 dark:bg-slate-950 dark:text-white">
      <BrandLogo className="h-auto w-80" priority />
      <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Cobrar en Venezuela, sin complicaciones.</h1>
      <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300">La plataforma B2B2C para gestionar tu tienda y recibir pagos de tus clientes.</p>
      <Link href="/login" className="mt-10 rounded-lg bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300">Entrar al panel</Link>
    </main>
  );
}

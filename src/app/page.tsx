import Link from "next/link";
import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-100 px-6 text-center text-slate-950 dark:bg-slate-950 dark:text-white">
      <Image src="/login-background.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-emerald-100/40 dark:from-slate-950/60 dark:to-emerald-950/45" />
      <section className="relative z-10 flex max-w-3xl flex-col items-center rounded-[2rem] border border-white/60 bg-white/65 px-8 py-12 shadow-2xl shadow-slate-900/10 backdrop-blur-md dark:border-white/15 dark:bg-slate-950/55 dark:shadow-black/30 sm:px-16 sm:py-16">
        <BrandLogo className="h-auto w-80" priority />
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Cobrar en Venezuela, sin complicaciones.</h1>
        <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300">La plataforma B2B2C para gestionar tu tienda y recibir pagos de tus clientes.</p>
        <Link href="/login" className="mt-10 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-400">Entrar al panel</Link>
      </section>
    </main>
  );
}

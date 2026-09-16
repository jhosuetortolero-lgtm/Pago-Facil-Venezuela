import { sendMagicLink } from "./actions";
import { BrandLogo } from "@/components/brand-logo";

type LoginPageProps = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-white/5">
        <BrandLogo className="mb-5 h-auto w-64" priority />
        <h1 className="text-3xl font-semibold">Entrar no painel</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Acesse sua loja com um link seguro enviado para o seu e-mail. Não usamos senhas.</p>
        {params.sent ? <p className="mt-6 rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">Confira seu e-mail para continuar.</p> : null}
        {params.error ? <p className="mt-6 rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{params.error}</p> : null}
        <form action={sendMagicLink} className="mt-8 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@negocio.com" className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 outline-none ring-emerald-400 transition focus:ring-2 dark:border-white/15 dark:bg-slate-900" />
          <button type="submit" className="h-12 w-full rounded-lg bg-emerald-400 font-semibold text-slate-950 transition hover:bg-emerald-300">Enviar link de acesso</button>
        </form>
      </section>
    </main>
  );
}

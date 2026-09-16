import { sendMagicLink } from "./actions";

type LoginPageProps = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="mb-3 text-sm font-semibold tracking-wide text-emerald-400">PAGOFÁCIL</p>
        <h1 className="text-3xl font-semibold">Entrar no painel</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Acesse sua loja com um link seguro enviado para o seu e-mail. Não usamos senhas.</p>
        {params.sent ? <p className="mt-6 rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">Confira seu e-mail para continuar.</p> : null}
        {params.error ? <p className="mt-6 rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{params.error}</p> : null}
        <form action={sendMagicLink} className="mt-8 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-200">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@negocio.com" className="h-12 w-full rounded-lg border border-white/15 bg-slate-900 px-4 outline-none ring-emerald-400 transition focus:ring-2" />
          <button type="submit" className="h-12 w-full rounded-lg bg-emerald-400 font-semibold text-slate-950 transition hover:bg-emerald-300">Enviar link de acesso</button>
        </form>
      </section>
    </main>
  );
}

import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
import { ActionButton } from "@/components/action-button";
import { sendMagicLink } from "./actions";

type LoginPageProps = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10 text-slate-950 sm:px-8">
      <Image src="/login-background.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-slate-950/45 dark:bg-slate-950/75" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/65 via-transparent to-emerald-950/55" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/30 bg-white/15 shadow-2xl shadow-slate-950/30 backdrop-blur-md lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[620px] flex-col justify-between p-10 text-white lg:flex xl:p-14">
          <div>
            <BrandLogo className="h-auto w-72 drop-shadow-2xl" priority />
            <div className="mt-16 max-w-lg">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">Ventas inteligentes en WhatsApp</p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-tight">Tu negocio cobra. PagoFácil hace el resto.</h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-white/80">Gestiona tu tienda, recibe pagos en dólares, bolívares y USDT, y mantén cada venta bajo control.</p>
            </div>
          </div>
          <p className="text-sm text-white/65">Una experiencia simple para comerciantes venezolanos.</p>
        </section>

        <section className="flex min-h-[620px] items-center bg-white/90 p-7 dark:bg-slate-950/88 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden"><BrandLogo className="h-auto w-56" priority /></div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Acceso seguro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Bienvenido de nuevo</h2>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">Entra a tu panel con un enlace mágico. Sin contraseñas y sin complicaciones.</p>

            {params.sent ? <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">Listo. Revisa tu correo y abre el enlace para entrar a tu cuenta.</p> : null}
            {params.error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{params.error}</p> : null}

            <form action={sendMagicLink} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-slate-800 dark:text-slate-200">Correo electrónico</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@negocio.com" className="mt-2 h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 dark:border-white/15 dark:bg-white/10 dark:text-white" />
              </div>
              <ActionButton>Enviar enlace de acceso</ActionButton>
            </form>
            <p className="mt-7 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">Al continuar, recibirás un enlace único y seguro en tu correo.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

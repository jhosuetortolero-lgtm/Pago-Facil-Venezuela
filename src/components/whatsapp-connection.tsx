"use client";

import Image from "next/image";
import { Check, CheckCircle2, CircleAlert, Clock3, Copy, ExternalLink, Loader2, MessageCircle, Phone, Power, QrCode, RefreshCw, RotateCcw, ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { useState, useTransition } from "react";
import { disconnectWaha, generateWahaQr, refreshWahaStatus, restartWahaSession, type WahaActionResult, type WahaSnapshot } from "@/app/admin/whatsapp/actions";

type Props = { initialSnapshot: WahaSnapshot };
type Feedback = { ok: boolean; message: string } | null;

const stateCopy = {
  connected: { label: "Conectado", caption: "Tu automatización está operativa", tone: "emerald" },
  qr: { label: "Esperando escaneo", caption: "Vincula tu teléfono para continuar", tone: "amber" },
  disconnected: { label: "Desconectado", caption: "La sesión necesita atención", tone: "red" },
  unknown: { label: "Sin verificar", caption: "Comprueba el estado de la sesión", tone: "slate" },
} as const;

function statusStyle(snapshot: WahaSnapshot) {
  const copy = stateCopy[snapshot.state];
  return {
    ...copy,
    dot: copy.tone === "emerald" ? "bg-emerald-400" : copy.tone === "amber" ? "bg-amber-400" : copy.tone === "red" ? "bg-red-400" : "bg-slate-400",
    badge: copy.tone === "emerald" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : copy.tone === "amber" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : copy.tone === "red" ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-white/15 bg-white/10 text-slate-300",
  };
}

export function WhatsappConnection({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const status = statusStyle(snapshot);

  function run(action: () => Promise<WahaActionResult>) {
    startTransition(async () => {
      const result = await action();
      setFeedback({ ok: result.ok, message: result.message });
      if (result.snapshot) setSnapshot(result.snapshot);
      if (result.qrDataUrl !== undefined) setQrDataUrl(result.qrDataUrl ?? null);
    });
  }

  async function copySession() {
    await navigator.clipboard.writeText(snapshot.session);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/80 bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-900/20 sm:px-10 sm:py-10">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300"><MessageCircle className="h-4 w-4" /> Centro de conexión</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">WhatsApp automatizado.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">Conecta tu número con PagoFácil y deja que tu tienda confirme pedidos, pagos y notificaciones en tiempo real.</p>
          </div>
          <div className={`inline-flex items-center gap-3 self-start rounded-2xl border px-4 py-3 ${status.badge}`}><span className="relative flex h-3 w-3"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${status.dot}`} /><span className={`relative inline-flex h-3 w-3 rounded-full ${status.dot}`} /></span><span><strong className="block text-sm">{status.label}</strong><span className="text-xs opacity-80">{status.caption}</span></span></div>
        </div>
      </section>

      {feedback ? <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${feedback.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}><span className="mt-0.5">{feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</span><span>{feedback.message}</span></div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="pf-glass-panel rounded-[1.75rem] border p-6 shadow-lg sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Emparejamiento seguro</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Escanea el código QR</h2><p className="mt-2 text-sm text-slate-500">El código es temporal y solo sirve para vincular esta sesión.</p></div><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><QrCode className="h-6 w-6" /></div></div>
          <div className="mt-7 grid gap-7 md:grid-cols-[minmax(220px,280px)_1fr] md:items-center">
            <div className="mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"><div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-8 border-slate-950/90 bg-slate-50">{qrDataUrl ? <Image src={qrDataUrl} alt="Código QR de conexión de WhatsApp" width={240} height={240} unoptimized className="h-full w-full object-contain" /> : <div className="text-center"><QrCode className="mx-auto h-24 w-24 text-slate-300" /><p className="mt-3 text-xs font-semibold text-slate-400">QR pendiente</p></div>}</div></div>
            <div className="space-y-5"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4"><p className="text-sm font-semibold text-emerald-900">Vincula tu cuenta en menos de un minuto</p><p className="mt-1 text-xs leading-5 text-emerald-800/80">Genera un QR nuevo cada vez que necesites conectar o volver a conectar tu sesión.</p></div><ol className="space-y-4">{[[Smartphone, "Abre WhatsApp", "Entra a WhatsApp desde tu teléfono."], [Wifi, "Dispositivos vinculados", "Abre el menú y selecciona dispositivos vinculados."], [QrCode, "Escanea el código", "Apunta la cámara al QR que aparece aquí."]].map(([Icon, title, text], index) => { const StepIcon = Icon as typeof Smartphone; return <li key={title as string} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span><span><strong className="flex items-center gap-2 text-sm text-slate-800"><StepIcon className="h-4 w-4 text-emerald-600" />{title as string}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{text as string}</span></span></li>; })}</ol><button type="button" onClick={() => run(generateWahaQr)} disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}{pending ? "Generando código..." : "Generar código QR"}</button></div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Control de sesión</p><h2 className="mt-2 text-2xl font-bold">Estado operativo</h2></div><ShieldCheck className="h-7 w-7 text-emerald-300" /></div>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-5"><div className="flex items-center gap-3"><span className={`relative flex h-3 w-3 ${snapshot.state === "connected" ? "" : "opacity-80"}`}><span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${status.dot} ${snapshot.state === "connected" ? "animate-ping" : ""}`} /><span className={`relative inline-flex h-3 w-3 rounded-full ${status.dot}`} /></span><div><p className="font-semibold">{status.label}</p><p className="text-xs text-slate-400">{snapshot.detail}</p></div></div></div>
          <dl className="mt-6 divide-y divide-white/10 text-sm"><div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-400">Sesión</dt><dd className="flex items-center gap-2 font-mono text-xs text-slate-200">{snapshot.session}<button type="button" onClick={copySession} aria-label="Copiar ID de sesión" className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></dd></div><div className="flex items-center justify-between gap-4 py-4"><dt className="flex items-center gap-2 text-slate-400"><Phone className="h-4 w-4" /> Número vinculado</dt><dd className="font-semibold text-slate-200">{snapshot.phone ?? "Pendiente"}</dd></div><div className="flex items-center justify-between gap-4 py-4"><dt className="text-slate-400">API URL</dt><dd className="max-w-[190px] truncate font-mono text-xs text-slate-300">{snapshot.apiUrl ?? "No configurada"}</dd></div></dl>
          <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => run(refreshWahaStatus)} disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Verificar estado</button><button type="button" onClick={() => run(restartWahaSession)} disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-60"><RotateCcw className="h-4 w-4" /> Reiniciar sesión</button></div>
          <button type="button" onClick={() => run(disconnectWaha)} disabled={pending} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 px-3 text-xs font-bold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"><Power className="h-4 w-4" /> Desconectar WhatsApp</button>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-800">Automatización activa</p><p className="mt-1 text-xs text-slate-500">Confirmaciones por WhatsApp</p></div></div></div><div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-600"><Clock3 className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-800">Sesión persistente</p><p className="mt-1 text-xs text-slate-500">Usa el mismo ID al reconectar</p></div></div></div><div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur"><div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-100 p-2 text-cyan-700"><ExternalLink className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-slate-800">API protegida</p><p className="mt-1 text-xs text-slate-500">La API Key nunca llega al navegador</p></div></div></div></section>
    </main>
  );
}

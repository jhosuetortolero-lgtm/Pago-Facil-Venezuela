"use client";

import Image from "next/image";
import { Check, Clipboard, DollarSign, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RenewalModalProps = {
  open: boolean;
  onClose: () => void;
  storeName: string;
  plan: string;
  amount: number | null;
};

const defaultBinanceId = "1278360860";
const defaultSupportPhone = "5581994401675";
const defaultQrUrl = "/binance-qr.jpeg";

export function RenewalModal({ open, onClose, storeName, plan, amount }: RenewalModalProps) {
  const [copied, setCopied] = useState(false);
  const binanceId = process.env.NEXT_PUBLIC_ADMIN_BINANCE_ID ?? defaultBinanceId;
  const supportPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? defaultSupportPhone).replace(/\D/g, "");
  const qrUrl = process.env.NEXT_PUBLIC_BINANCE_QR_URL ?? defaultQrUrl;
  const amountLabel = amount !== null && Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const whatsappUrl = useMemo(() => {
    const message = `Hola. Me comunico para notificar el pago de ${amountLabel} USDT por la renovación de la suscripción de '${storeName}'. Envío el comprobante adjunto para su respectiva auditoría y reactivación en el sistema. Muchas gracias.`;
    return `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;
  }, [amountLabel, storeName, supportPhone]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = ""; };
  }, [onClose, open]);

  if (!open) return null;

  async function copyBinanceId() {
    await navigator.clipboard.writeText(binanceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section aria-labelledby="renewal-modal-title" aria-modal="true" className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/20 bg-slate-950 text-white shadow-2xl shadow-emerald-950/40" role="dialog">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-emerald-500/25 via-cyan-400/10 to-transparent blur-2xl" />
        <button type="button" onClick={onClose} aria-label="Cerrar modal" className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"><X className="h-5 w-5" /></button>
        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25"><DollarSign className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">PagoFácil · Renovaciones</p><h2 id="renewal-modal-title" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Renueva tu Suscripción</h2></div></div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div><p className="text-sm text-slate-400">Plan actual</p><p className="mt-1 text-lg font-bold">Plan {planLabel}</p></div><p className="rounded-xl bg-emerald-400/15 px-4 py-2 text-lg font-bold text-emerald-300">{amountLabel} USDT</p></div>
          <div className="mt-6 grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-center"><div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-xl shadow-black/20"><Image src={qrUrl} alt="Código QR de Binance Pay" width={260} height={260} className="h-auto w-full max-w-[230px] rounded-xl" unoptimized /></div><p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Realiza el pago en USDT</p><div className="mt-3 flex items-center justify-center gap-2"><span className="font-mono text-sm text-slate-200">Binance Pay ID: {binanceId}</span><button type="button" onClick={copyBinanceId} className="rounded-lg border border-white/15 p-2 text-slate-300 transition hover:border-emerald-300/50 hover:text-emerald-300" aria-label="Copiar Binance Pay ID">{copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</button></div>{copied ? <p className="mt-2 text-xs font-semibold text-emerald-300">ID copiado al portapapeles</p> : null}</div>
            <div className="flex flex-col justify-center"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">1</span><div><p className="font-semibold">Escanea el código QR</p><p className="mt-1 text-sm text-slate-400">Abre Binance Pay y envía exactamente {amountLabel} USDT.</p></div></div><div className="my-4 ml-4 h-8 border-l border-dashed border-white/20" /><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">2</span><div><p className="font-semibold">Guarda tu comprobante</p><p className="mt-1 text-sm text-slate-400">Conserva la captura de la transferencia para la auditoría.</p></div></div><div className="my-4 ml-4 h-8 border-l border-dashed border-white/20" /><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span><div><p className="font-semibold">Envía el comprobante</p><p className="mt-1 text-sm text-slate-400">Nuestro equipo verificará el pago y reactivará tu suscripción.</p></div></div></div>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-5 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-[#38e477]"><MessageCircle className="h-5 w-5" />Ya pagué, enviar comprobante</a><p className="mt-3 text-center text-xs text-slate-500">Se abrirá WhatsApp con un mensaje de renovación preparado para tu tienda.</p>
        </div>
      </section>
    </div>
  );
}

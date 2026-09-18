import { ArrowUpRight, Clock3, DollarSign, TrendingUp } from "lucide-react";
import type { ExchangeRateSnapshot } from "@/lib/exchange-rate";

function formatRate(value: number | null) {
  return value === null
    ? "No disponible"
    : `Bs. ${value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Sin actualización disponible";
  return new Date(value).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" });
}

export function ExchangeRateWidget({ rates }: { rates: ExchangeRateSnapshot }) {
  return (
    <section className="pf-card-3d overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/30 backdrop-blur-md sm:p-5" aria-label="Cotización del dólar en Venezuela">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><DollarSign className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Cotización USD / VES</p><p className="mt-1 text-sm font-semibold text-slate-900">Referencia cambiaria de Venezuela</p></div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 className="h-3.5 w-3.5" /> Actualizado {formatUpdatedAt(rates.official.updatedAt ?? rates.parallel.updatedAt)}</div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Tasa BCV</span><TrendingUp className="h-4 w-4 text-emerald-600" /></div><p className="mt-2 text-xl font-bold tracking-tight text-emerald-950">{formatRate(rates.official.value)}</p><p className="mt-1 text-[11px] text-emerald-800/70">Fuente oficial</p></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-600">Dólar paralelo</span><ArrowUpRight className="h-4 w-4 text-slate-500" /></div><p className="mt-2 text-xl font-bold tracking-tight text-slate-900">{formatRate(rates.parallel.value)}</p><p className="mt-1 text-[11px] text-slate-500">Referencia del mercado</p></div>
      </div>
    </section>
  );
}

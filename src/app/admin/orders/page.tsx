import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, FileSearch, MessageCircle, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveOrder, rejectOrder } from "../actions";
import { MerchantOrderActions } from "@/components/merchant-order-actions";

export const dynamic = "force-dynamic";
type OcrData = { moneda?: string; numero_referencia?: string | null; es_legible?: boolean } | null;
const statuses: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pendiente", tone: "bg-amber-50 text-amber-700" },
  manual_review: { label: "Revisión manual", tone: "bg-orange-50 text-orange-700" },
  verified: { label: "Aprobado", tone: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Rechazado", tone: "bg-red-50 text-red-700" },
  fraud_alert: { label: "Alerta de fraude", tone: "bg-red-50 text-red-700" },
  fraud_alert_duplicate: { label: "Comprobante duplicado", tone: "bg-red-50 text-red-700" },
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; updated?: string; error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user!.id).maybeSingle();
  const { data: orders } = store ? await supabase.from("orders").select("id, customer_name, customer_phone, total_usd, payment_method, status, payment_reference, payment_proof_path, ocr_data, created_at").eq("store_id", store.id).order("created_at", { ascending: false }) : { data: [] };
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  const rows = await Promise.all((orders ?? []).map(async (order) => {
    const signed = order.payment_proof_path && admin ? await admin.storage.from("payment-proofs").createSignedUrl(order.payment_proof_path, 3600) : { data: null };
    return { ...order, proofUrl: signed.data?.signedUrl ?? null };
  }));
  const params = await searchParams;
  const wahaConfigured = Boolean(process.env.WAHA_URL && process.env.WAHA_API_KEY);
  const visible = params.status ? rows.filter((order) => order.status === params.status) : rows;
  const pending = rows.filter((order) => ["pending", "manual_review"].includes(order.status)).length;
  return <main className="mx-auto max-w-[1400px] space-y-8 px-5 py-8 sm:px-8 lg:px-10">
    <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-emerald-700">Operación de la tienda</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Ventas y pedidos</h1><p className="mt-2 text-sm text-slate-500">Audita comprobantes, revisa OCR y confirma pagos.</p></div><div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${wahaConfigured ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}><MessageCircle className="h-4 w-4" /> WAHA {wahaConfigured ? "configurado" : "desconectado"}</div></header>
    {params.error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</div> : null}
    {params.updated ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Pedido actualizado y se intentó notificar al cliente por WhatsApp.</div> : null}
    {!store ? <section className="rounded-2xl border bg-white p-10 text-center"><ReceiptText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-semibold">Crea tu tienda para ver pedidos.</p><Link href="/admin/dashboard" className="mt-3 inline-flex text-sm font-semibold text-emerald-700">Ir al resumen</Link></section> : <>
      <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total de pedidos</p><p className="mt-2 text-3xl font-bold">{rows.length}</p></div><div className="rounded-2xl border bg-amber-50 p-5 shadow-sm"><p className="text-sm text-amber-700">Pendientes de revisión</p><p className="mt-2 text-3xl font-bold text-amber-900">{pending}</p></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Auditoría OCR</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><FileSearch className="h-4 w-4" /> Comprobantes privados</p></div></section>
      <nav className="flex flex-wrap gap-2"><Link href="/admin/orders" className={`rounded-lg px-3 py-2 text-xs font-semibold ${!params.status ? "bg-slate-950 text-white" : "bg-white text-slate-500"}`}>Todos</Link>{[["manual_review", "Revisión manual"], ["verified", "Aprobados"], ["cancelled", "Rechazados"]].map(([value, label]) => <Link key={value} href={`/admin/orders?status=${value}`} className={`rounded-lg px-3 py-2 text-xs font-semibold ${params.status === value ? "bg-slate-950 text-white" : "bg-white text-slate-500"}`}>{label}</Link>)}</nav>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{visible.length ? visible.map((order) => { const status = statuses[order.status] ?? statuses.pending; const ocr = order.ocr_data as OcrData; const reviewable = ["pending", "manual_review"].includes(order.status); return <article key={order.id} className="grid gap-5 p-6 lg:grid-cols-[112px_1fr_auto]"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{order.proofUrl ? <div role="img" aria-label="Comprobante de pago" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${order.proofUrl})` }} /> : <ReceiptText className="h-8 w-8 text-slate-300" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Pedido #{order.id.slice(0, 8)}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span></div><div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2"><p>Cliente: <strong className="text-slate-800">{order.customer_name || "Sin nombre"}</strong></p><p>WhatsApp: <strong className="text-slate-800">{order.customer_phone || "No indicado"}</strong></p><p>Método: <strong className="text-slate-800">{order.payment_method.replace("_", " ")}</strong></p><p>Monto: <strong className="text-emerald-700">${Number(order.total_usd).toFixed(2)} USD</strong></p></div><div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><strong>OCR:</strong> {ocr?.es_legible ? "Legible" : "Requiere revisión"} · Ref: {ocr?.numero_referencia || order.payment_reference || "No detectada"} · Moneda: {ocr?.moneda || "No detectada"}</div></div><div className="flex flex-col justify-between gap-3 lg:items-end"><time className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString("es-VE")}</time>{reviewable ? <MerchantOrderActions orderId={order.id} approve={approveOrder} reject={rejectOrder} /> : order.status === "verified" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Confirmado</span> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><AlertCircle className="h-4 w-4" /> Cerrado</span>}</div></article>; }) : <div className="px-6 py-16 text-center"><Clock3 className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-semibold">No hay pedidos en esta vista</h2><p className="mt-1 text-sm text-slate-500">Los comprobantes aparecerán aquí automáticamente.</p></div>}</div></section>
    </>}
  </main>;
}

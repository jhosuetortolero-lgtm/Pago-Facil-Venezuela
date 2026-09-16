"use client";

import { useRef, useState } from "react";
import { useCart } from "@/lib/cart";

type PaymentDetails = { zelle_email: string | null; pago_movil_phone: string | null; pago_movil_bank: string | null; pago_movil_id: string | null; binance_pay_id: string | null };

export function CheckoutModal({ storeSlug, paymentDetails }: { storeSlug: string; paymentDetails: PaymentDetails }) {
  const { items, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"zelle" | "pago_movil" | "binance_pay">("zelle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const total = items.reduce((sum, item) => sum + item.price_usd, 0);
  if (!items.length && !open) return null;
  const instructions = method === "zelle" ? `Zelle: ${paymentDetails.zelle_email ?? "datos no configurados"}` : method === "pago_movil" ? `Pago Móvil: ${paymentDetails.pago_movil_bank ?? "Banco no configurado"} · ${paymentDetails.pago_movil_phone ?? "teléfono no configurado"} · ${paymentDetails.pago_movil_id ?? "ID no configurado"}` : `Binance Pay (USDT): ${paymentDetails.binance_pay_id ?? "ID no configurado"}`;
  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file || !["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Sube una imagen JPG o PNG de hasta 5 MB."); return; }
    setMessage("Validando tu comprobante...");
    const body = new FormData();
    body.append("store_slug", storeSlug); body.append("payment_method", method); body.append("total_usd", String(total)); body.append("product_ids", JSON.stringify(items.map((item) => item.id))); body.append("proof", file);
    const response = await fetch("/api/ocr", { method: "POST", body });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "No se pudo procesar el pedido."); return; }
    setMessage(result.status === "verified" ? "¡Pago verificado! Gracias por tu compra." : result.status === "fraud_alert_duplicate" ? "Este comprobante ya fue utilizado." : "Recibimos tu pedido y será revisado por la tienda.");
    clear();
  }
  return <>{!open ? <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">Continuar al pago</button> : <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6"><section className="w-full max-w-md rounded-xl bg-white p-6"><h2 className="text-xl font-semibold">Completa tu pago</h2><p className="mt-2 text-sm text-slate-600">Total: ${total.toFixed(2)} USD. Solo necesitamos tu comprobante.</p><div className="mt-5 grid gap-3"><div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"><button onClick={() => setMethod("zelle")} className={`rounded-md px-2 py-2 text-xs font-semibold ${method === "zelle" ? "bg-white shadow" : "text-slate-500"}`}>Zelle (USD)</button><button onClick={() => setMethod("pago_movil")} className={`rounded-md px-2 py-2 text-xs font-semibold ${method === "pago_movil" ? "bg-white shadow" : "text-slate-500"}`}>Pago Móvil (VES)</button><button onClick={() => setMethod("binance_pay")} className={`rounded-md px-2 py-2 text-xs font-semibold ${method === "binance_pay" ? "bg-white shadow" : "text-slate-500"}`}>Binance (USDT)</button></div><p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{instructions}</p><label className="text-sm font-medium">Comprobante (JPG o PNG, máximo 5 MB)<input ref={fileRef} type="file" accept="image/jpeg,image/png" className="mt-1 block w-full text-sm" /></label>{message ? <p className="text-sm text-slate-600">{message}</p> : null}<div className="flex gap-3"><button onClick={() => setOpen(false)} className="flex-1 rounded-lg border px-4 py-3">Cerrar</button><button onClick={submit} className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">Enviar comprobante</button></div></div></section></div>}</>;
}

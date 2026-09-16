"use client";

import { useCart } from "@/lib/cart";
import { CheckoutModal } from "@/components/checkout-modal";

type PaymentDetails = { zelle_email: string | null; pago_movil_phone: string | null; pago_movil_bank: string | null; pago_movil_id: string | null; binance_pay_id: string | null };

export function StorefrontCart({ storeSlug, paymentDetails }: { storeSlug: string; paymentDetails: PaymentDetails }) {
  const { items, remove } = useCart();
  const total = items.reduce((sum, item) => sum + item.price_usd, 0);
  if (!items.length) return <aside className="rounded-xl border bg-white p-5 text-sm text-slate-500">Tu carrito está vacío.</aside>;
  return <aside className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Tu carrito</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span>{item.name}</span><button onClick={() => remove(item.id)} className="text-red-600">Quitar</button></div>)}</div><div className="mt-5 flex justify-between border-t pt-4 font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div><CheckoutModal storeSlug={storeSlug} paymentDetails={paymentDetails} /></aside>;
}

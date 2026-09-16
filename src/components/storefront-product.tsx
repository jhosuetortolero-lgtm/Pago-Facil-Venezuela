"use client";

import { useCart } from "@/lib/cart";

export function StorefrontProduct({ product }: { product: { id: string; name: string; description: string | null; price_usd: number } }) {
  const add = useCart((state) => state.add);
  return <article className="rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">{product.name}</h2><p className="mt-2 min-h-12 text-sm text-slate-600">{product.description || "Producto disponible"}</p><div className="mt-5 flex items-center justify-between"><span className="font-semibold text-emerald-700">${Number(product.price_usd).toFixed(2)}</span><button onClick={() => add({ id: product.id, name: product.name, price_usd: Number(product.price_usd) })} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Agregar</button></div></article>;
}

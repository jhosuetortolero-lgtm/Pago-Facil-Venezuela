import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorefrontCart } from "@/components/storefront-cart";
import { StorefrontProduct } from "@/components/storefront-product";
import { BrandLogo } from "@/components/brand-logo";

type StorefrontRow = { store_name: string; store_slug: string; product_id: string | null; product_name: string | null; product_description: string | null; price_usd: number | null; zelle_email: string | null; pago_movil_phone: string | null; pago_movil_bank: string | null; pago_movil_id: string | null; binance_pay_id: string | null };

export default async function StorefrontPage({ params }: { params: Promise<{ "store-slug": string }> }) {
  const { "store-slug": slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_storefront", { requested_slug: slug }) as { data: StorefrontRow[] | null; error: { message: string } | null };
  if (error || !data?.length) notFound();
  const store = data[0];
  const products = data.filter((item): item is StorefrontRow & { product_id: string; product_name: string; price_usd: number } => Boolean(item.product_id && item.product_name && item.price_usd !== null));
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><header className="mb-10 flex items-center gap-5"><BrandLogo className="h-28 w-48" priority /><div><h1 className="text-4xl font-semibold">{store.store_name}</h1><p className="mt-2 text-slate-600">Compra fácil y paga con tus opciones preferidas.</p></div></header><div className="grid gap-8 lg:grid-cols-[1fr_320px]"><section className="grid gap-4 sm:grid-cols-2">{products.map((product) => <StorefrontProduct key={product.product_id} product={{ id: product.product_id, name: product.product_name, description: product.product_description, price_usd: product.price_usd }} />)}</section><StorefrontCart storeSlug={slug} paymentDetails={{ zelle_email: store.zelle_email, pago_movil_phone: store.pago_movil_phone, pago_movil_bank: store.pago_movil_bank, pago_movil_id: store.pago_movil_id, binance_pay_id: store.binance_pay_id }} /></div></div></main>;
}

import Link from "next/link";
import {
  Box,
  ExternalLink,
  Image as ImageIcon,
  PackageOpen,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createProduct, deleteProduct, updateProduct } from "../actions";
import { MerchantProductForm } from "@/components/merchant-product-form";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, onboarding_status")
    .eq("owner_id", user!.id)
    .maybeSingle();
  const [{ data: products }, { data: entitlements }] = store
    ? await Promise.all([
        supabase
          .from("products")
          .select(
            "id, name, description, image_url, price_usd, stock, is_active, created_at",
          )
          .eq("store_id", store.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_store_entitlements", { target_store_id: store.id }),
      ])
    : [{ data: [] }, { data: [] }];
  const limits = (entitlements?.[0]?.limits ?? {}) as {
    products?: number | null;
  };
  const productLimit =
    typeof limits.products === "number" ? limits.products : null;
  const productCount = products?.length ?? 0;
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Catálogo de la tienda
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Productos
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Gestiona los productos que tus clientes podrán ver y comprar en tu
            vitrina pública.
          </p>
        </div>
        {store ? (
          <MerchantProductForm storeId={store.id} action={createProduct} />
        ) : null}
      </div>
      {params.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {params.error}
        </div>
      ) : null}
      {params.created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Producto creado correctamente.
        </div>
      ) : null}
      {params.updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Producto actualizado correctamente.
        </div>
      ) : null}
      {!store ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <PackageOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold">Primero crea tu tienda</h2>
          <Link
            href="/admin/dashboard"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:underline"
          >
            Ir al resumen
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Productos publicados</p>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                  <Box className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold">{productCount}</p>
              <p className="mt-1 text-xs text-slate-500">
                Artículos en tu catálogo
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Plan contratado</p>
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  <span className="text-xs font-bold uppercase">
                    {entitlements?.[0]?.plan_code ?? "Growth"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold">{productLimit ?? "∞"}</p>
              <p className="mt-1 text-xs text-slate-500">Límite de productos</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Vitrina pública</p>
                <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                  <ExternalLink className="h-5 w-5" />
                </div>
              </div>
              <Link
                href={`/${store.slug}`}
                target="_blank"
                className="mt-4 block truncate text-sm font-semibold text-emerald-700 hover:underline"
              >
                /{store.slug}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                Ver cómo la ven tus clientes
              </p>
            </div>
          </section>
          {productLimit !== null ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  Uso del límite del plan
                </span>
                <span className="font-semibold text-slate-500">
                  {productCount} / {productLimit}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${productCount / productLimit > 0.85 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{
                    width: `${Math.min(100, (productCount / productLimit) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">Tu catálogo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mantén tus precios y descripciones actualizados.
              </p>
            </div>
            {products?.length ? (
              <div className="divide-y divide-slate-100">
                {products.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 bg-cover bg-center text-slate-400" style={product.image_url ? { backgroundImage: `url(${product.image_url})` } : undefined}>
                        {product.image_url ? null : <ImageIcon className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {product.name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {product.description || "Sin descripción"}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className="font-semibold text-emerald-700">
                            ${Number(product.price_usd).toFixed(2)} USD
                          </span>
                          <span className={`inline-flex items-center gap-1 ${product.stock > 0 ? "text-slate-500" : "text-amber-600"}`}>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                            />
                            {product.stock > 0 ? `${product.stock} en stock` : "Sin stock"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MerchantProductForm storeId={store.id} action={updateProduct} product={product} />
                    <form action={deleteProduct}>
                      <input
                        type="hidden"
                        name="product_id"
                        value={product.id}
                      />
                      <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </button>
                    </form>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <PackageOpen className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 font-semibold text-slate-900">
                  Tu catálogo está vacío
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea tu primer producto para comenzar a vender.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { createStore, refreshAutomaticRate, updateStore } from "../actions";
import { ExchangeRateToggle } from "@/components/exchange-rate-toggle";
import { Activity, Boxes, Clock3, DollarSign } from "lucide-react";
import { MerchantSubmitButton } from "@/components/merchant-submit-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; section?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select(
      "id, name, slug, onboarding_status, zelle_email, pago_movil_phone, pago_movil_bank, pago_movil_id, binance_pay_id, exchange_rate_mode, manual_exchange_rate, current_exchange_rate",
    )
    .eq("owner_id", user!.id)
    .maybeSingle();
  const params = await searchParams;
  const isActive = store?.onboarding_status === "active";
  const [{ count: productCount }, { data: orderRows }] = store
    ? await Promise.all([
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id),
        supabase
          .from("orders")
          .select("total_usd, status")
          .eq("store_id", store.id),
      ])
    : [{ count: 0 }, { data: [] }];
  const totalSales = (orderRows ?? [])
    .filter((order) => order.status === "verified")
    .reduce((total, order) => total + Number(order.total_usd ?? 0), 0);
  const pendingOrders = (orderRows ?? []).filter((order) =>
    ["pending", "manual_review"].includes(order.status),
  ).length;
  const { data: entitlements } = store
    ? await supabase.rpc("get_store_entitlements", { target_store_id: store.id })
    : { data: [] };
  const plan = entitlements?.[0]?.plan_code ?? "growth";
  const planLimit = typeof entitlements?.[0]?.limits?.products === "number" ? entitlements[0].limits.products : null;
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div>
        <p className="text-sm text-slate-500">Panel del comerciante</p>
        <h1 className="text-3xl font-semibold">Resumen de tu negocio</h1>
      </div>
      {params.error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {params.error}
        </p>
      ) : null}
      {params.saved === "1" ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          Configuración guardada correctamente. Tu tienda ya está lista para
          operar.
        </p>
      ) : null}
      {!store ? (
        <section className="max-w-xl rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Crea tu tienda</h2>
          <p className="mt-2 text-sm text-slate-600">
            Configura el nombre público y el enlace de tu vitrina.
          </p>
          <form action={createStore} className="mt-5 grid gap-4">
            <input
              name="name"
              required
              placeholder="Nombre del negocio"
              className="h-11 rounded-lg border px-3"
            />
            <input
              name="slug"
              placeholder="mi-tienda"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              className="h-11 rounded-lg border px-3"
            />
            <p className="-mt-2 text-xs text-slate-500">
              Opcional. Si lo dejas vacío, generaremos el enlace automáticamente.
            </p>
            <button className="rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">
              Crear tienda
            </button>
          </form>
        </section>
      ) : (
        <section className="pf-glass-panel rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">
            {isActive ? "Panel principal" : "Configuración de pagos"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isActive
              ? "Tu tienda está activa y lista para operar."
              : "Completa estos datos para activar tu tienda."}
          </p>
          {isActive ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-sm text-emerald-800">Estado</p><Activity className="h-5 w-5 text-emerald-600" /></div>
                  <p className="mt-2 text-2xl font-semibold text-emerald-900">Activa</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Productos</p><Boxes className="h-5 w-5 text-slate-400" /></div>
                  <p className="mt-2 text-2xl font-semibold">{productCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Ventas verificadas</p><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                  <p className="mt-2 text-2xl font-semibold">${totalSales.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-sm text-amber-800">Pedidos pendientes</p><Clock3 className="h-5 w-5 text-amber-600" /></div>
                  <p className="mt-2 text-2xl font-semibold text-amber-900">{pendingOrders}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Link href="/admin/products" className="rounded-xl border p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                  <p className="font-semibold">Gestionar productos</p>
                  <p className="mt-1 text-sm text-slate-500">Agregar y administrar tu catálogo.</p>
                </Link>
                <Link href="?section=settings#configuracion" className="rounded-xl border p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                  <p className="font-semibold">Métodos de pago</p>
                  <p className="mt-1 text-sm text-slate-500">Editar Zelle y Pago Móvil.</p>
                </Link>
                <Link href={`/${store.slug}`} target="_blank" className="rounded-xl border p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                  <p className="font-semibold">Ver vitrina pública</p>
                  <p className="mt-1 truncate text-sm text-slate-500">/{store.slug}</p>
                </Link>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-slate-500">Suscripción y límites</p>
                    <p className="mt-1 text-xl font-semibold capitalize text-slate-900">
                      Plan {plan}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {entitlements?.[0]?.price_usd
                        ? `$${Number(entitlements[0].price_usd).toFixed(2)} / mes`
                        : "Precio mensual configurado por el administrador"}
                    </p>
                  </div>
                  <div className="min-w-48">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Uso de productos</span>
                      <span>
                        {productCount ?? 0} / {planLimit ?? "∞"}
                      </span>
                    </div>
                    {planLimit ? (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(100, ((productCount ?? 0) / planLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <details id="configuracion" className="mt-8 border-t pt-6" open={!isActive || params.section === "settings"}>
            <summary className="cursor-pointer list-none text-lg font-semibold">Configuración de pagos</summary>
          <form action={updateStore} className="mt-6 grid max-w-2xl gap-4">
            <label className="text-sm font-medium">
              Nombre de la tienda
              <input
                name="name"
                required
                defaultValue={store.name}
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Enlace público (opcional)
              <input
                name="slug"
                defaultValue={store.slug}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Si lo dejas vacío, generaremos uno automáticamente.
              </span>
            </label>
            <label className="text-sm font-medium">
              Correo Zelle
              <input
                name="zelle_email"
                defaultValue={store.zelle_email ?? ""}
                placeholder="pagos@negocio.com"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Teléfono Pago Móvil
              <input
                name="pago_movil_phone"
                defaultValue={store.pago_movil_phone ?? ""}
                placeholder="0412-1234567"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Banco
              <input
                name="pago_movil_bank"
                defaultValue={store.pago_movil_bank ?? ""}
                placeholder="Banco de Venezuela"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Cédula / RIF
              <input
                name="pago_movil_id"
                defaultValue={store.pago_movil_id ?? ""}
                placeholder="V-12345678"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <label className="text-sm font-medium">
              Binance Pay ID
              <input
                name="binance_pay_id"
                defaultValue={store.binance_pay_id ?? ""}
                placeholder="Tu identificador de Binance Pay"
                className="mt-1 h-11 w-full rounded-lg border px-3"
              />
            </label>
            <div className="border-t pt-4">
              <p className="mb-3 text-sm font-medium">Tasa de cambio</p>
              <ExchangeRateToggle
                automatic={store.exchange_rate_mode === "automatic"}
              />
              <p className="mt-2 text-xs text-slate-500">
                Tasa BCV simulada actual:{" "}
                {store.current_exchange_rate ?? "sin actualizar"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <MerchantSubmitButton>Guardar configuración</MerchantSubmitButton>
              <button
                formAction={refreshAutomaticRate}
                className="rounded-lg border px-4 py-3 font-semibold"
              >
                Actualizar tasa BCV
              </button>
            </div>
          </form>
          </details>
        </section>
      )}
    </main>
  );
}

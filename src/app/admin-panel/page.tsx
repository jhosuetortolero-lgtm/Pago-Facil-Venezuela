import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createStoreWithPlan,
  inviteUser,
  renewSubscription,
  signOut,
  toggleStoreStatus,
} from "./actions";
import AdminDashboard, {
  type OrderRow,
  type SalesSummary,
} from "./dashboard-client";
import { getExchangeRates } from "@/lib/exchange-rate";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = user
    ? await supabase
        .from("profiles")
        .select("is_super_admin, status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  if (!user || !me?.is_super_admin || me.status !== "active") {
    redirect("/admin/dashboard");
  }

  const [storesResult, ordersResult, profilesResult] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, owner_id, onboarding_status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, store_id, total_usd, payment_method, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, email, is_super_admin, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (storesResult.error || ordersResult.error || profilesResult.error) {
    console.error("No se pudieron cargar los datos del panel de administración", {
      stores: storesResult.error,
      orders: ordersResult.error,
      profiles: profilesResult.error,
    });
    throw new Error("No se pudieron cargar los datos del panel.");
  }

  const stores = storesResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const allProfiles = profilesResult.data ?? [];
  const storeIds = stores.map((store) => store.id);

  const subscriptionsResult = storeIds.length
    ? await supabase
        .from("store_subscriptions")
        .select("store_id, plan_code, price_usd, current_period_end")
        .in("store_id", storeIds)
    : { data: [], error: null };

  if (subscriptionsResult.error) {
    console.error(
      "No se pudieron cargar las suscripciones",
      subscriptionsResult.error,
    );
    throw new Error("No se pudieron cargar las suscripciones del panel.");
  }

  const profileById = new Map(
    allProfiles.map((profile) => [profile.id, profile]),
  );
  const subscriptionByStoreId = new Map(
    (subscriptionsResult.data ?? []).map((subscription) => [
      subscription.store_id,
      subscription,
    ]),
  );
  const storeNameById = new Map(
    stores.map((store) => [store.id, store.name]),
  );

  const storeRows = stores.map((store) => {
    const owner = profileById.get(store.owner_id);
    const subscription = subscriptionByStoreId.get(store.id);
    const status =
      owner?.status === "suspended"
        ? "suspended"
        : store.onboarding_status === "pending" || !owner
          ? "pending"
          : "active";

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      email: owner?.email ?? "Sin correo registrado",
      status: status as "active" | "suspended" | "pending",
      plan: subscription
        ? subscription.plan_code === "enterprise"
          ? ("Enterprise" as const)
          : ("Growth" as const)
        : null,
      price: subscription?.price_usd == null
        ? null
        : Number(subscription.price_usd),
      currentPeriodEnd: subscription?.current_period_end ?? null,
    };
  });

  const orderRows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    storeName: storeNameById.get(order.store_id) ?? "Tienda no disponible",
    totalUsd: Number(order.total_usd ?? 0),
    paymentMethod: order.payment_method as OrderRow["paymentMethod"],
    status: order.status as OrderRow["status"],
    createdAt: order.created_at,
  }));

  const verifiedOrders = orderRows.filter(
    (order) => order.status === "verified",
  );
  const pendingOrders = orderRows.filter((order) =>
    ["pending", "manual_review"].includes(order.status),
  );
  const totalSales = verifiedOrders.reduce(
    (sum, order) => sum + order.totalUsd,
    0,
  );

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const last30DaysStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
  );
  const salesSummary: SalesSummary = {
    totalLast30Days: verifiedOrders
      .filter((order) => new Date(order.createdAt) >= last30DaysStart)
      .reduce((sum, order) => sum + order.totalUsd, 0),
    ordersToday: orderRows.filter(
      (order) => order.createdAt.slice(0, 10) === todayKey,
    ).length,
    verifiedToday: verifiedOrders.filter(
      (order) => order.createdAt.slice(0, 10) === todayKey,
    ).length,
    daily: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - (6 - index),
        ),
      );
      const dateKey = date.toISOString().slice(0, 10);
      const dayOrders = orderRows.filter(
        (order) => order.createdAt.slice(0, 10) === dateKey,
      );
      return {
        date: dateKey,
        totalUsd: dayOrders
          .filter((order) => order.status === "verified")
          .reduce((sum, order) => sum + order.totalUsd, 0),
        orderCount: dayOrders.length,
      };
    }),
  };

  const params = await searchParams;
  const exchangeRates = await getExchangeRates();

  return (
    <AdminDashboard
      currentUser={{ email: user.email ?? "Administrador" }}
      stores={storeRows}
      orders={orderRows}
      salesSummary={salesSummary}
      metrics={{
        totalStores: storeRows.length,
        activeStores: storeRows.filter((store) => store.status === "active")
          .length,
        totalSales,
        pendingOrders: pendingOrders.length,
      }}
      error={params.error}
      onToggleStatus={toggleStoreStatus}
      onCreateStore={createStoreWithPlan}
      onRenewSubscription={renewSubscription}
      onInviteUser={inviteUser}
      users={allProfiles.map((profile) => ({
        id: profile.id,
        name: profile.email.split("@")[0],
        email: profile.email,
        role: profile.is_super_admin ? "Super Admin" : "Comerciante",
        registeredAt: profile.created_at,
        status: profile.status,
      }))}
      onSignOut={signOut}
      exchangeRates={exchangeRates}
    />
  );
}

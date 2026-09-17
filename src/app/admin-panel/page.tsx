import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStoreWithPlan, toggleStoreStatus, signOut } from "./actions";
import AdminDashboard from "./dashboard-client";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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

  const [{ data: stores }, { data: orders }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, slug, owner_id, onboarding_status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("orders").select("total_usd, status"),
  ]);

  const storeIds = (stores ?? []).map((store) => store.id);
  const [{ data: subscriptions }] = storeIds.length
    ? await Promise.all([
        supabase
          .from("store_subscriptions")
          .select("store_id, plan_code, price_usd")
          .in("store_id", storeIds),
      ])
    : [{ data: [] }];
  const subscriptionByStoreId = new Map(
    (subscriptions ?? []).map((subscription) => [
      subscription.store_id,
      subscription,
    ]),
  );
  const ownerIds = (stores ?? []).map((store) => store.owner_id);
  const { data: profiles } = ownerIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, status")
        .in("id", ownerIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const storeRows = (stores ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    ownerId: store.owner_id,
    email: profileById.get(store.owner_id)?.email ?? "Sin correo registrado",
    status:
      store.onboarding_status ??
      profileById.get(store.owner_id)?.status ??
      "pending",
    plan: (subscriptionByStoreId.get(store.id)?.plan_code === "enterprise"
      ? "Enterprise"
      : "Growth") as "Growth" | "Enterprise",
    price: subscriptionByStoreId.get(store.id)?.price_usd ?? null,
  }));

  const verifiedOrders = (orders ?? []).filter(
    (order) => order.status === "verified",
  );
  const pendingOrders = (orders ?? []).filter((order) =>
    ["pending", "manual_review"].includes(order.status),
  );
  const totalSales = verifiedOrders.reduce(
    (sum, order) => sum + Number(order.total_usd ?? 0),
    0,
  );

  const params = await searchParams;

  return (
    <AdminDashboard
      currentUser={{ email: user.email ?? "Administrador" }}
      stores={storeRows}
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
      onSignOut={signOut}
    />
  );
}

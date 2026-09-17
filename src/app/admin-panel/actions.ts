"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const toggleSchema = z.object({
  profile_id: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
});
const createStoreSchema = z.object({
  owner_email: z.string().trim().email(),
  plan_code: z.enum(["growth", "enterprise"]),
  custom_price: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().positive(),
  ),
});

export async function toggleStoreStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_super_admin || me.status !== "active")
    redirect("/admin/dashboard");
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin-panel?error=Datos%20inválidos.");
  const { error } = await supabase
    .from("profiles")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.profile_id);
  if (error)
    redirect("/admin-panel?error=No%20se%20pudo%20actualizar%20el%20estado.");
  revalidatePath("/admin-panel");
}

export async function createStoreWithPlan(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("is_super_admin, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_super_admin || me.status !== "active")
    redirect("/admin/dashboard");

  const parsed = createStoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/admin-panel?error=Dados%20da%20loja%20inv%C3%A1lidos.");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    redirect(
      "/admin-panel?error=Falta%20configurar%20SUPABASE_SERVICE_ROLE_KEY.",
    );

  const admin = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const email = parsed.data.owner_email.trim().toLowerCase();
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/admin/dashboard`
    : undefined;

  let ownerId: string | null = null;
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  ownerId = invited.user?.id ?? null;

  if (inviteError || !ownerId) {
    let page = 1;
    do {
      const { data: users, error: usersError } =
        await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (usersError) break;
      const existing = users.users.find(
        (candidate) => candidate.email?.toLowerCase() === email,
      );
      if (existing) {
        ownerId = existing.id;
        break;
      }
      page += 1;
      if (users.users.length < 1000) break;
    } while (!ownerId);
  }

  if (!ownerId)
    redirect(
      "/admin-panel?error=No%20se%20pudo%20crear%20o%20encontrar%20el%20usuario%20del%20propietario.",
    );

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", ownerId)
    .maybeSingle();
  if (!existingProfile) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: ownerId,
      email,
      is_super_admin: false,
      status: "active",
    });
    if (profileError)
      redirect(
        "/admin-panel?error=El%20usuario%20fue%20creado%20pero%20no%20se%20pudo%20crear%20su%20perfil.",
      );
  }

  const slug = `tienda-en-configuracion-${ownerId.slice(0, 8)}`;
  const { data: store, error: storeError } = await admin
    .from("stores")
    .insert({
      owner_id: ownerId,
      name: "Tienda en configuración",
      slug,
      onboarding_status: "pending",
    })
    .select("id")
    .single();
  if (storeError || !store)
    redirect("/admin-panel?error=No%20se%20pudo%20crear%20la%20tienda.");

  const { error: subscriptionError } = await admin
    .from("store_subscriptions")
    .insert({
      store_id: store.id,
      plan_code: parsed.data.plan_code,
      price_usd: parsed.data.custom_price,
      status: "active",
    });
  if (subscriptionError) {
    await admin.from("stores").delete().eq("id", store.id);
    redirect("/admin-panel?error=No%20se%20pudo%20activar%20el%20plan.");
  }
  revalidatePath("/admin-panel");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

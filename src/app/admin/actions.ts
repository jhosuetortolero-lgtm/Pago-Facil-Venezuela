"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .or(z.literal("")),
  zelle_email: z.union([z.literal(""), z.string().email()]),
  pago_movil_phone: z.string().trim().max(30),
  pago_movil_bank: z.string().trim().max(80),
  pago_movil_id: z.string().trim().max(40),
  binance_pay_id: z.string().trim().max(120),
  exchange_rate_mode: z.enum(["automatic", "manual"]),
  manual_exchange_rate: z.coerce.number().positive().optional(),
});

function generatedSlug(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "tienda"}-${crypto.randomUUID().slice(0, 8)}`;
}
const productSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  image_url: z.union([z.literal(""), z.string().url()]),
  price_usd: z.coerce.number().positive().max(99999999),
  stock: z.coerce.number().int().nonnegative().max(999999999),
});
const productUpdateSchema = productSchema.extend({ product_id: z.string().uuid() });
const orderActionSchema = z.object({ order_id: z.string().uuid() });

async function ownedStore() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("stores")
    .select("id, slug, onboarding_status")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { supabase, user, store: data };
}

export async function createStore(formData: FormData) {
  const { supabase, user } = await ownedStore();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .optional()
        .or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/admin/dashboard?error=Revisa%20el%20nombre%20y%20el%20slug.");
  const { error } = await supabase
    .from("stores")
    .insert({
      ...parsed.data,
      slug: parsed.data.slug || generatedSlug(parsed.data.name),
      owner_id: user.id,
      onboarding_status: "active",
    });
  if (error)
    redirect("/admin/dashboard?error=No%20se%20pudo%20crear%20la%20tienda.");
  revalidatePath("/admin/dashboard");
}

export async function updateStore(formData: FormData) {
  const { supabase, store } = await ownedStore();
  if (!store) redirect("/admin/dashboard?error=Crea%20tu%20tienda%20primero.");
  const parsed = storeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect("/admin/dashboard?error=Revisa%20los%20datos%20ingresados.");
  const slug = parsed.data.slug || store.slug || generatedSlug(parsed.data.name);
  const { data: updatedStore, error } = await supabase
    .from("stores")
    .update({
      ...parsed.data,
      slug,
      manual_exchange_rate:
        parsed.data.exchange_rate_mode === "manual"
          ? parsed.data.manual_exchange_rate
          : null,
      onboarding_status: "active",
    })
    .eq("id", store.id)
    .select("id, name, slug, onboarding_status")
    .maybeSingle();
  if (error || !updatedStore)
    redirect(
      "/admin/dashboard?error=No%20se%20pudo%20guardar%20la%20configuración.",
    );
  revalidatePath("/admin/dashboard", "page");
  revalidatePath("/admin/products", "page");
  redirect("/admin/dashboard?view=summary&saved=1");
}

export async function refreshAutomaticRate() {
  const { supabase, store } = await ownedStore();
  if (!store) return;
  // Mock da consulta diária à taxa BCV; será substituído por Cron/API na próxima etapa.
  await supabase
    .from("stores")
    .update({
      exchange_rate_mode: "automatic",
      current_exchange_rate: 36.5,
      exchange_rate_updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);
  revalidatePath("/admin/dashboard");
}

export async function createProduct(formData: FormData) {
  const { supabase, store } = await ownedStore();
  if (!store) redirect("/admin/products?error=Crea%20tu%20tienda%20primero.");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.store_id !== store.id)
    redirect("/admin/products?error=Datos%20de%20producto%20inválidos.");
  const { data: entitlements } = await supabase.rpc("get_store_entitlements", {
    target_store_id: store.id,
  });
  const limits = (entitlements?.[0]?.limits ?? {}) as {
    products?: number | null;
  };
  if (typeof limits.products === "number") {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id);
    if ((count ?? 0) >= limits.products)
      redirect(
        "/admin/products?error=El%20l%C3%ADmite%20de%20productos%20de%20tu%20plan%20fue%20alcanzado.",
      );
  }
  const { store_id, ...product } = parsed.data;
  const { error } = await supabase
    .from("products")
    .insert({ ...product, store_id });
  if (error)
    redirect("/admin/products?error=No%20se%20pudo%20crear%20el%20producto.");
  revalidatePath("/admin/products");
  redirect("/admin/products?created=1");
}

export async function deleteProduct(formData: FormData) {
  const { supabase, store } = await ownedStore();
  const productId = z.string().uuid().safeParse(formData.get("product_id"));
  if (!store || !productId.success) return;
  await supabase
    .from("products")
    .delete()
    .eq("id", productId.data)
    .eq("store_id", store.id);
  revalidatePath("/admin/products");
}

export async function updateProduct(formData: FormData) {
  const { supabase, store } = await ownedStore();
  const parsed = productUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!store || !parsed.success || parsed.data.store_id !== store.id)
    redirect("/admin/products?error=Datos%20de%20producto%20inv%C3%A1lidos.");
  const { product_id, store_id, ...product } = parsed.data;
  const { error } = await supabase.from("products").update(product).eq("id", product_id).eq("store_id", store_id);
  if (error) redirect("/admin/products?error=No%20se%20pudo%20actualizar%20el%20producto.");
  revalidatePath("/admin/products");
  redirect("/admin/products?updated=1");
}

async function notifyCustomer(order: { customer_phone: string | null; total_usd: number; id: string }, approved: boolean) {
  const baseUrl = process.env.WAHA_URL?.replace(/\/$/, "");
  const apiKey = process.env.WAHA_API_KEY;
  const session = process.env.WAHA_SESSION ?? "default";
  const phone = order.customer_phone?.replace(/[^0-9]/g, "");
  if (!baseUrl || !apiKey || !phone) return;
  await fetch(`${baseUrl}/api/sendText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify({ session, chatId: `${phone}@c.us`, text: approved ? `✅ Pago confirmado. Pedido ${order.id} por $${Number(order.total_usd).toFixed(2)} USD aprobado.` : `⚠️ El comprobante del pedido ${order.id} no pudo ser aprobado. Contacta a la tienda para recibir ayuda.` }),
  });
}

async function updateOrderStatus(formData: FormData, status: "verified" | "cancelled", approved: boolean) {
  const { supabase, store } = await ownedStore();
  const parsed = orderActionSchema.safeParse(Object.fromEntries(formData));
  if (!store || !parsed.success) redirect("/admin/orders?error=Pedido%20inv%C3%A1lido.");
  const { data: order } = await supabase.from("orders").select("id, customer_phone, total_usd").eq("id", parsed.data.order_id).eq("store_id", store.id).maybeSingle();
  if (!order) redirect("/admin/orders?error=No%20se%20encontr%C3%B3%20el%20pedido.");
  const { error } = await supabase.from("orders").update({ status }).eq("id", order.id).eq("store_id", store.id);
  if (error) redirect("/admin/orders?error=No%20se%20pudo%20actualizar%20el%20pedido.");
  try { await notifyCustomer(order, approved); } catch { /* El estado queda actualizado aunque WAHA no esté disponible. */ }
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/orders?updated=${approved ? "approved" : "rejected"}`);
}

export async function approveOrder(formData: FormData) { return updateOrderStatus(formData, "verified", true); }
export async function rejectOrder(formData: FormData) { return updateOrderStatus(formData, "cancelled", false); }

export async function signOutMerchant() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

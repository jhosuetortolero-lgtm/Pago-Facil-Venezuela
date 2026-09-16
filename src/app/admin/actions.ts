"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const storeSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), zelle_email: z.union([z.literal(""), z.string().email()]), pago_movil_phone: z.string().trim().max(30), pago_movil_bank: z.string().trim().max(80), pago_movil_id: z.string().trim().max(40), exchange_rate_mode: z.enum(["automatic", "manual"]), manual_exchange_rate: z.coerce.number().positive().optional() });
const productSchema = z.object({ store_id: z.string().uuid(), name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000), price_usd: z.coerce.number().positive().max(99999999) });

async function ownedStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("stores").select("id, slug").eq("owner_id", user.id).maybeSingle();
  return { supabase, user, store: data };
}

export async function createStore(formData: FormData) {
  const { supabase, user } = await ownedStore();
  const parsed = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/dashboard?error=Revisa%20el%20nombre%20y%20el%20slug.");
  const { error } = await supabase.from("stores").insert({ ...parsed.data, owner_id: user.id });
  if (error) redirect("/admin/dashboard?error=No%20se%20pudo%20crear%20la%20tienda.");
  revalidatePath("/admin/dashboard");
}

export async function updateStore(formData: FormData) {
  const { supabase, store } = await ownedStore();
  if (!store) redirect("/admin/dashboard?error=Crea%20tu%20tienda%20primero.");
  const parsed = storeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/dashboard?error=Revisa%20los%20datos%20ingresados.");
  const { error } = await supabase.from("stores").update({ ...parsed.data, manual_exchange_rate: parsed.data.exchange_rate_mode === "manual" ? parsed.data.manual_exchange_rate : null }).eq("id", store.id);
  if (error) redirect("/admin/dashboard?error=No%20se%20pudo%20guardar%20la%20configuración.");
  revalidatePath("/admin/dashboard");
}

export async function refreshAutomaticRate() {
  const { supabase, store } = await ownedStore();
  if (!store) return;
  // Mock da consulta diária à taxa BCV; será substituído por Cron/API na próxima etapa.
  await supabase.from("stores").update({ exchange_rate_mode: "automatic", current_exchange_rate: 36.5, exchange_rate_updated_at: new Date().toISOString() }).eq("id", store.id);
  revalidatePath("/admin/dashboard");
}

export async function createProduct(formData: FormData) {
  const { supabase, store } = await ownedStore();
  if (!store) redirect("/admin/products?error=Crea%20tu%20tienda%20primero.");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.store_id !== store.id) redirect("/admin/products?error=Datos%20de%20producto%20inválidos.");
  const { store_id, ...product } = parsed.data;
  const { error } = await supabase.from("products").insert({ ...product, store_id });
  if (error) redirect("/admin/products?error=No%20se%20pudo%20crear%20el%20producto.");
  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const { supabase, store } = await ownedStore();
  const productId = z.string().uuid().safeParse(formData.get("product_id"));
  if (!store || !productId.success) return;
  await supabase.from("products").delete().eq("id", productId.data).eq("store_id", store.id);
  revalidatePath("/admin/products");
}

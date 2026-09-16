"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const toggleSchema = z.object({ profile_id: z.string().uuid(), status: z.enum(["active", "suspended"]) });

export async function toggleStoreStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("is_super_admin, status").eq("id", user.id).maybeSingle();
  if (!me?.is_super_admin || me.status !== "active") redirect("/admin/dashboard");
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin-panel?error=Datos%20inválidos.");
  const { error } = await supabase.from("profiles").update({ status: parsed.data.status }).eq("id", parsed.data.profile_id);
  if (error) redirect("/admin-panel?error=No%20se%20pudo%20actualizar%20el%20estado.");
  revalidatePath("/admin-panel");
}

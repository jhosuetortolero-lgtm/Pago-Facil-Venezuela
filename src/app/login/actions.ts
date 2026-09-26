"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation";

function getCallbackUrl(origin: string | null) {
  const siteUrl = origin ?? process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) return null;

  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return new URL("/auth/callback", url).toString();
  } catch {
    return null;
  }
}

export async function sendMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/login?error=Digite%20um%20e-mail%20válido.");

  const callbackUrl = getCallbackUrl((await headers()).get("origin"));
  if (!callbackUrl) {
    redirect(
      `/login?error=${encodeURIComponent("No se pudo determinar la URL de acceso. Revisa la configuración del sitio.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error) {
    console.error("No se pudo enviar el magic link", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    redirect(
      `/login?error=${encodeURIComponent("El servicio de acceso no está disponible en este momento. Inténtalo de nuevo más tarde.")}`,
    );
  }

  redirect("/login?sent=1");
}

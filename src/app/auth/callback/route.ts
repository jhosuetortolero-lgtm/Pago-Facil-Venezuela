import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LOGIN_ERRORS = {
  invalidLink: "El enlace de acceso no es válido o ya expiró. Solicita uno nuevo.",
  unavailable: "No se pudo conectar con el servicio de acceso. Inténtalo de nuevo más tarde.",
  profile: "No se pudo preparar tu cuenta. Contacta con el soporte.",
  suspended: "Tu cuenta está suspendida.",
} as const;

function redirectToLogin(requestUrl: URL, message: string) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const providerError = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");

  if (providerError || !code) {
    return redirectToLogin(requestUrl, LOGIN_ERRORS.invalidLink);
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("No se pudo intercambiar el código del magic link", {
      code: exchangeError.code,
      status: exchangeError.status,
      message: exchangeError.message,
    });
    return redirectToLogin(
      requestUrl,
      exchangeError.status === 0
        ? LOGIN_ERRORS.unavailable
        : LOGIN_ERRORS.invalidLink,
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("No se pudo recuperar el usuario autenticado", {
      code: userError?.code,
      status: userError?.status,
      message: userError?.message,
    });
    return redirectToLogin(
      requestUrl,
      userError?.status === 0
        ? LOGIN_ERRORS.unavailable
        : LOGIN_ERRORS.invalidLink,
    );
  }

  const { data: existing, error: profileError } = await supabase
    .from("profiles")
    .select("is_super_admin, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("No se pudo consultar el perfil autenticado", {
      code: profileError.code,
    });
    return redirectToLogin(requestUrl, LOGIN_ERRORS.profile);
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      is_super_admin: false,
      status: "active",
    });

    if (insertError) {
      console.error("No se pudo crear el perfil autenticado", {
        code: insertError.code,
      });
      return redirectToLogin(requestUrl, LOGIN_ERRORS.profile);
    }
  }

  if (existing?.status === "suspended") {
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, LOGIN_ERRORS.suspended);
  }

  return NextResponse.redirect(
    new URL(
      existing?.is_super_admin ? "/admin-panel" : "/admin/dashboard",
      requestUrl.origin,
    ),
  );
}

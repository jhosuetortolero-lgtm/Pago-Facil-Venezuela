"use server";

import { createClient } from "@/lib/supabase/server";

type WahaState = "connected" | "qr" | "disconnected" | "unknown";

export type WahaSnapshot = {
  configured: boolean;
  state: WahaState;
  session: string;
  apiUrl: string | null;
  phone: string | null;
  pushName: string | null;
  detail: string;
};

export type WahaActionResult = {
  ok: boolean;
  message: string;
  snapshot?: WahaSnapshot;
  qrDataUrl?: string | null;
};

type WahaResponse = { ok: boolean; status: number; data?: unknown; error?: string };

function getConfig() {
  return {
    baseUrl: process.env.WAHA_URL?.replace(/\/$/, "") ?? "",
    apiKey: process.env.WAHA_API_KEY ?? "",
    session: process.env.WAHA_SESSION ?? "default",
  };
}

async function wahaRequest(path: string, init?: RequestInit): Promise<WahaResponse> {
  const { baseUrl, apiKey } = getConfig();
  if (!baseUrl || !apiKey) return { ok: false, status: 503, error: "WAHA no está configurado en el servidor." };
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-Api-Key": apiKey, ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : contentType.startsWith("image/")
        ? `data:${contentType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`
        : await response.text();
    return response.ok ? { ok: true, status: response.status, data } : { ok: false, status: response.status, data, error: `WAHA respondió con HTTP ${response.status}.` };
  } catch {
    return { ok: false, status: 503, error: "No fue posible comunicarse con WAHA. Verifica la URL y la sesión." };
  }
}

async function requireMerchant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "Sesión no válida." };
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).maybeSingle();
  if (!store) return { ok: false as const, reason: "Primero crea tu tienda." };
  return { ok: true as const };
}

function sessionState(data: unknown): WahaState {
  const value = data as { status?: string; state?: string } | null;
  const status = String(value?.status ?? value?.state ?? "").toUpperCase();
  if (["WORKING", "CONNECTED", "ONLINE"].includes(status)) return "connected";
  if (["SCAN_QR_CODE", "QR", "AUTHENTICATING"].includes(status)) return "qr";
  if (["STOPPED", "FAILED", "DISCONNECTED", "OFFLINE"].includes(status)) return "disconnected";
  return "unknown";
}

function sessionPhone(data: unknown) {
  const value = data as { me?: { id?: string; user?: string }; phone?: string } | null;
  const raw = value?.me?.user ?? value?.me?.id ?? value?.phone ?? null;
  return raw?.replace(/@c\.us$/, "") ?? null;
}

function snapshotFrom(data?: unknown, detail = "Estado no disponible."): WahaSnapshot {
  const config = getConfig();
  const value = data as { me?: { pushName?: string } } | null;
  return { configured: Boolean(config.baseUrl && config.apiKey), state: sessionState(data), session: config.session, apiUrl: config.baseUrl || null, phone: sessionPhone(data), pushName: value?.me?.pushName ?? null, detail };
}

export async function getWahaSnapshot(): Promise<WahaSnapshot> {
  const merchant = await requireMerchant();
  if (!merchant.ok) return snapshotFrom(undefined, merchant.reason);
  const { session } = getConfig();
  const result = await wahaRequest(`/api/sessions/${encodeURIComponent(session)}`);
  return result.ok ? snapshotFrom(result.data, "Sesión consultada correctamente.") : snapshotFrom(undefined, result.error ?? "La sesión todavía no está iniciada.");
}

async function getQrDataUrl(): Promise<string | null> {
  const { session } = getConfig();
  for (const path of [`/api/${encodeURIComponent(session)}/auth/qr`, `/api/sessions/${encodeURIComponent(session)}/auth/qr`]) {
    const result = await wahaRequest(path);
    if (!result.ok) continue;
    if (typeof result.data === "string") return result.data.startsWith("data:image") ? result.data : `data:image/png;base64,${result.data}`;
    const data = result.data as { data?: string; qr?: string } | undefined;
    const value = data?.data ?? data?.qr;
    if (value) return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
  }
  return null;
}

export async function generateWahaQr(): Promise<WahaActionResult> {
  const merchant = await requireMerchant();
  if (!merchant.ok) return { ok: false, message: merchant.reason };
  const { session } = getConfig();
  const start = await wahaRequest(`/api/sessions/${encodeURIComponent(session)}/start`, { method: "POST", body: "{}" });
  if (!start.ok && start.status !== 409 && start.status !== 422) return { ok: false, message: start.error ?? "No se pudo iniciar la sesión." };
  const qrDataUrl = await getQrDataUrl();
  const snapshot = await getWahaSnapshot();
  return qrDataUrl ? { ok: true, message: "Código QR generado. Escanéalo desde WhatsApp.", snapshot, qrDataUrl } : { ok: false, message: "WAHA no devolvió un código QR. Verifica que la sesión esté esperando autenticación.", snapshot };
}

export async function refreshWahaStatus(): Promise<WahaActionResult> {
  const merchant = await requireMerchant();
  if (!merchant.ok) return { ok: false, message: merchant.reason };
  const snapshot = await getWahaSnapshot();
  return { ok: snapshot.state === "connected", message: snapshot.state === "connected" ? "WhatsApp está conectado." : snapshot.detail, snapshot };
}

export async function restartWahaSession(): Promise<WahaActionResult> {
  const merchant = await requireMerchant();
  if (!merchant.ok) return { ok: false, message: merchant.reason };
  const { session } = getConfig();
  await wahaRequest(`/api/sessions/${encodeURIComponent(session)}/stop`, { method: "POST", body: "{}" });
  const result = await wahaRequest(`/api/sessions/${encodeURIComponent(session)}/start`, { method: "POST", body: "{}" });
  const snapshot = await getWahaSnapshot();
  return result.ok || result.status === 409 ? { ok: true, message: "Sesión reiniciada. Espera unos segundos para escanear el QR.", snapshot } : { ok: false, message: result.error ?? "No se pudo reiniciar la sesión.", snapshot };
}

export async function disconnectWaha(): Promise<WahaActionResult> {
  const merchant = await requireMerchant();
  if (!merchant.ok) return { ok: false, message: merchant.reason };
  const { session } = getConfig();
  const result = await wahaRequest(`/api/sessions/${encodeURIComponent(session)}/logout`, { method: "POST", body: "{}" });
  const snapshot = await getWahaSnapshot();
  return result.ok ? { ok: true, message: "WhatsApp fue desconectado correctamente.", snapshot, qrDataUrl: null } : { ok: false, message: result.error ?? "No se pudo desconectar WhatsApp.", snapshot };
}

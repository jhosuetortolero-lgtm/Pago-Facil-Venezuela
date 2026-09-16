import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, ocrSchema } from "@/lib/checkout-validation";

export const runtime = "nodejs";
const attempts = new Map<string, number[]>();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png"]);

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 10) { attempts.set(ip, recent); return true; }
  recent.push(now); attempts.set(ip, recent); return false;
}

const receiptSchema = {
  type: "object",
  properties: {
    monto: { type: ["number", "null"] },
    moneda: { type: "string", enum: ["USD", "VES", "USDT", "desconocida"] },
    numero_referencia: { type: ["string", "null"] },
    es_legible: { type: "boolean" },
  },
  required: ["monto", "moneda", "numero_referencia", "es_legible"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Demasiadas tentativas. Intenta de nuevo en un minuto." }, { status: 429 });
  const form = await request.formData();
  const fileValue = form.get("proof");
  let productIds: unknown = [];
  try { productIds = JSON.parse(String(form.get("product_ids") ?? "[]")); } catch { productIds = null; }
  const parsed = checkoutSchema.safeParse({ storeSlug: form.get("store_slug"), paymentMethod: form.get("payment_method"), totalUsd: form.get("total_usd"), productIds });
  if (!parsed.success || !(fileValue instanceof File) || fileValue.size === 0 || fileValue.size > MAX_FILE_SIZE || !allowedTypes.has(fileValue.type)) return NextResponse.json({ error: "Comprobante inválido. Usa una imagen JPG o PNG de hasta 5 MB." }, { status: 400 });

  const admin = createAdminClient();
  const { data: store } = await admin.from("stores").select("id, zelle_email, pago_movil_phone, pago_movil_bank, pago_movil_id, binance_pay_id").eq("slug", parsed.data.storeSlug).maybeSingle();
  if (!store) return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });
  const { data: products } = await admin.from("products").select("id, price_usd").eq("store_id", store.id).eq("is_active", true).in("id", parsed.data.productIds);
  if (!products || products.length !== new Set(parsed.data.productIds).size) return NextResponse.json({ error: "El carrito contiene productos inválidos." }, { status: 400 });
  const calculatedTotal = products.reduce((sum, product) => sum + Number(product.price_usd), 0);
  if (Math.abs(calculatedTotal - parsed.data.totalUsd) > 0.01) return NextResponse.json({ error: "El total del carrito cambió. Actualiza e intenta nuevamente." }, { status: 409 });

  const { data: order, error: orderError } = await admin.from("orders").insert({ store_id: store.id, total_usd: calculatedTotal, payment_method: parsed.data.paymentMethod, status: "pending" }).select("id").single();
  if (orderError || !order) return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  const proofPath = `${store.id}/${order.id}.${fileValue.type === "image/png" ? "png" : "jpg"}`;
  const upload = await admin.storage.from("payment-proofs").upload(proofPath, fileValue, { contentType: fileValue.type, upsert: false });
  if (upload.error) { await admin.from("orders").update({ status: "manual_review" }).eq("id", order.id); return NextResponse.json({ orderId: order.id, status: "manual_review" }); }

  let extracted: z.infer<typeof ocrSchema> | null = null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const base64 = Buffer.from(await fileValue.arrayBuffer()).toString("base64");
    const methodName = parsed.data.paymentMethod === "zelle" ? "Zelle" : parsed.data.paymentMethod === "pago_movil" ? "Pago Móvil" : "Binance Pay (USDT)";
    const response = await openai.chat.completions.create({ model: "gpt-4o-mini", temperature: 0, response_format: { type: "json_schema", json_schema: { name: "universal_payment_receipt", strict: true, schema: receiptSchema } }, messages: [{ role: "system", content: `Eres un extractor de comprobantes. Procesa imágenes de ${methodName} y devuelve únicamente el JSON solicitado. Para Zelle (pantalla verde), extrae Confirmation Number. Para Pago Móvil (recibos de bancos venezolanos), extrae Número de Referencia. Para Binance Pay (pantalla amarilla u oscura), extrae Order ID. Si la imagen está borrosa o el dato no se puede leer, usa es_legible=false y numero_referencia=null. No inventes datos; moneda debe ser USD, VES, USDT o desconocida.` }, { role: "user", content: [{ type: "text", text: `Analiza este comprobante de ${methodName}.` }, { type: "image_url", image_url: { url: `data:${fileValue.type};base64,${base64}`, detail: "high" } }] }] });
    extracted = ocrSchema.parse(JSON.parse(response.choices[0]?.message.content ?? "{}"));
  } catch { extracted = null; }

  const ocrData = extracted;
  const save = await admin.from("orders").update({ payment_reference: extracted?.numero_referencia ?? null, payment_proof_path: proofPath, ocr_data: ocrData }).eq("id", order.id);
  if (save.error?.code === "23505") {
    await admin.from("orders").update({ status: "fraud_alert_duplicate" }).eq("id", order.id);
    return NextResponse.json({ orderId: order.id, status: "fraud_alert_duplicate" });
  }

  let status: "verified" | "manual_review" = "manual_review";
  if (extracted?.es_legible && extracted.monto !== null && extracted.monto >= calculatedTotal && !save.error) status = "verified";
  await admin.from("orders").update({ status }).eq("id", order.id);
  return NextResponse.json({ orderId: order.id, status });
}

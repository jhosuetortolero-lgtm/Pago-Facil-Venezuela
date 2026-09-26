"use client";

import { useRef, useState } from "react";
import { useCart } from "@/lib/cart";

type PaymentMethod = "zelle" | "pago_movil" | "binance_pay";
type CheckoutStatus = "verified" | "manual_review" | "fraud_alert_duplicate";
type MessageTone = "info" | "error";

type PaymentDetails = {
  zelle_email: string | null;
  pago_movil_phone: string | null;
  pago_movil_bank: string | null;
  pago_movil_id: string | null;
  binance_pay_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResponseError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "No se pudo procesar el pedido.";
}

function getResponseStatus(value: unknown): CheckoutStatus | null {
  if (!isRecord(value) || typeof value.status !== "string") return null;
  if (
    value.status === "verified" ||
    value.status === "manual_review" ||
    value.status === "fraud_alert_duplicate"
  ) {
    return value.status;
  }
  return null;
}

export function CheckoutModal({
  storeSlug,
  paymentDetails,
  exchangeRate,
}: {
  storeSlug: string;
  paymentDetails: PaymentDetails;
  exchangeRate: number | null;
}) {
  const { items, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("zelle");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalUsd = items.reduce(
    (sum, item) => sum + item.price_usd * item.quantity,
    0,
  );
  const hasExchangeRate =
    exchangeRate !== null && Number.isFinite(exchangeRate) && exchangeRate > 0;
  const totalVes = hasExchangeRate
    ? Math.round(totalUsd * exchangeRate * 100) / 100
    : null;

  if (!items.length && !open) return null;

  const instructions =
    method === "zelle"
      ? `Zelle: ${paymentDetails.zelle_email ?? "datos no configurados"}`
      : method === "pago_movil"
        ? `Pago Móvil: ${paymentDetails.pago_movil_bank ?? "Banco no configurado"} · ${
            paymentDetails.pago_movil_phone ?? "teléfono no configurado"
          } · ${paymentDetails.pago_movil_id ?? "ID no configurado"}`
        : `Binance Pay (USDT): ${paymentDetails.binance_pay_id ?? "ID no configurado"}`;

  function clearMessage() {
    setMessage("");
    setMessageTone("info");
  }

  function showError(errorMessage: string) {
    setMessage(errorMessage);
    setMessageTone("error");
  }

  function selectMethod(nextMethod: PaymentMethod) {
    setMethod(nextMethod);
    clearMessage();
  }

  async function submit() {
    if (submittingRef.current) return;

    const file = fileRef.current?.files?.[0];
    if (!customerPhone.trim()) {
      showError("Indica tu número de WhatsApp para recibir la confirmación.");
      return;
    }
    if (method === "pago_movil" && totalVes === null) {
      showError(
        "La tasa BCV no está disponible en este momento. Intenta nuevamente más tarde.",
      );
      return;
    }
    if (
      !file ||
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      showError("Sube una imagen JPG o PNG de hasta 5 MB.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage("Validando tu comprobante...");
    setMessageTone("info");

    const body = new FormData();
    body.append("store_slug", storeSlug);
    body.append("customer_name", customerName);
    body.append("customer_phone", customerPhone);
    body.append("payment_method", method);
    body.append("total_usd", String(totalUsd));
    body.append(
      "items",
      JSON.stringify(
        items.map((item) => ({ id: item.id, quantity: item.quantity })),
      ),
    );
    body.append("proof", file);

    try {
      const response = await fetch("/api/ocr", { method: "POST", body });
      const result: unknown = await response.json();

      if (!response.ok) {
        showError(getResponseError(result));
        return;
      }

      const status = getResponseStatus(result);
      if (!status) {
        showError("El servidor devolvió una respuesta inesperada.");
        return;
      }
      if (status === "fraud_alert_duplicate") {
        showError("Este comprobante ya fue utilizado.");
        return;
      }

      clear();
      setOpen(false);
    } catch {
      showError("Error al procesar el pedido. Intenta nuevamente.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => {
            clearMessage();
            setOpen(true);
          }}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
        >
          Continuar al pago
        </button>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
            className="w-full max-w-md rounded-xl bg-white p-6"
          >
            <h2 id="checkout-title" className="text-xl font-semibold">
              Completa tu pago
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Total del pedido: ${totalUsd.toFixed(2)} USD
            </p>
            <div className="mt-5 grid gap-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nombre (opcional)"
                className="h-11 rounded-lg border px-3"
              />
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="WhatsApp, ej. 584121234567"
                className="h-11 rounded-lg border px-3"
              />
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => selectMethod("zelle")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold ${
                    method === "zelle" ? "bg-white shadow" : "text-slate-500"
                  }`}
                >
                  Zelle (USD)
                </button>
                <button
                  type="button"
                  onClick={() => selectMethod("pago_movil")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold ${
                    method === "pago_movil"
                      ? "bg-white shadow"
                      : "text-slate-500"
                  }`}
                >
                  Pago Móvil (VES)
                </button>
                <button
                  type="button"
                  onClick={() => selectMethod("binance_pay")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold ${
                    method === "binance_pay"
                      ? "bg-white shadow"
                      : "text-slate-500"
                  }`}
                >
                  Binance (USDT)
                </button>
              </div>

              {method === "pago_movil" ? (
                totalVes !== null && exchangeRate !== null ? (
                  <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                    <p className="font-semibold">
                      Monto a pagar: Bs. {totalVes.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Tasa BCV: Bs. {exchangeRate.toFixed(4)} por USD
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    La tasa BCV no está disponible. No confirmes el pago hasta
                    que podamos mostrar el monto exacto en bolívares.
                  </p>
                )
              ) : null}

              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {instructions}
              </p>
              <label className="text-sm font-medium">
                Comprobante (JPG o PNG, máximo 5 MB)
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="mt-1 block w-full text-sm"
                />
              </label>
              {message ? (
                <p
                  role={messageTone === "error" ? "alert" : "status"}
                  className={`rounded-lg p-3 text-sm ${
                    messageTone === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {message}
                </p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={
                    isSubmitting || (method === "pago_movil" && totalVes === null)
                  }
                  aria-busy={isSubmitting}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {isSubmitting ? "Guardando pedido..." : "Confirmar pedido"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

"use client";

import { CheckoutModal } from "@/components/checkout-modal";
import { useCart } from "@/lib/cart";

type PaymentDetails = {
  zelle_email: string | null;
  pago_movil_phone: string | null;
  pago_movil_bank: string | null;
  pago_movil_id: string | null;
  binance_pay_id: string | null;
};

export function StorefrontCart({
  storeSlug,
  paymentDetails,
  exchangeRate,
}: {
  storeSlug: string;
  paymentDetails: PaymentDetails;
  exchangeRate: number | null;
}) {
  const { items, remove, updateQuantity } = useCart();
  const total = items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

  function handleQuantityChange(itemId: string, newQuantity: number) {
    if (newQuantity <= 0) {
      remove(itemId);
      return;
    }

    updateQuantity(itemId, newQuantity);
  }

  if (!items.length) {
    return (
      <aside className="rounded-xl border bg-white p-5 text-sm text-slate-500">
        Tu carrito está vacío.
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Tu carrito</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex-1">
              <span>{item.name}</span>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  aria-label={`Disminuir cantidad de ${item.name}`}
                  className="rounded-full border px-2 py-0.5 text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={item.quantity}
                  aria-label={`Cantidad de ${item.name}`}
                  onChange={(event) => {
                    const quantity = event.currentTarget.valueAsNumber;
                    if (Number.isFinite(quantity)) {
                      handleQuantityChange(item.id, quantity);
                    }
                  }}
                  className="w-12 rounded border px-2 py-0.5 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  aria-label={`Aumentar cantidad de ${item.name}`}
                  className="rounded-full border px-2 py-0.5 text-xs"
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right">
              <span>${(item.price_usd * item.quantity).toFixed(2)}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="block text-xs text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-between border-t pt-4 font-semibold">
        <span>Total</span>
        <span>${total.toFixed(2)} USD</span>
      </div>
      <CheckoutModal
        storeSlug={storeSlug}
        paymentDetails={paymentDetails}
        exchangeRate={exchangeRate}
      />
    </aside>
  );
}

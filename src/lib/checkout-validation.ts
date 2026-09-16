import { z } from "zod";

export const checkoutSchema = z.object({
  storeSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  paymentMethod: z.enum(["zelle", "pago_movil", "binance_pay"]),
  totalUsd: z.coerce.number().positive().finite(),
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

export const ocrSchema = z.object({
  monto: z.number().nonnegative().nullable(),
  moneda: z.enum(["USD", "VES", "USDT", "desconocida"]),
  numero_referencia: z.string().trim().max(120).nullable(),
  es_legible: z.boolean(),
});

import { z } from "zod";

const checkoutItemSchema = z.object({
  id: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(999),
});

const optionalPositiveNumber = z.preprocess(
  (value) => (value === null || value === "" ? null : value),
  z.coerce.number().positive().finite().nullable(),
);

export const checkoutSchema = z
  .object({
    storeSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    customerName: z.string().trim().max(120).optional().or(z.literal("")),
    customerPhone: z.string().trim().min(7).max(20),
    paymentMethod: z.enum(["zelle", "pago_movil", "binance_pay"]),
    totalUsd: z.coerce.number().positive().finite(),
    exchangeRate: optionalPositiveNumber,
    totalVes: optionalPositiveNumber,
    items: z
      .array(checkoutItemSchema)
      .min(1)
      .max(100)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        "El carrito contiene productos duplicados.",
      ),
  })
  .superRefine((checkout, context) => {
    if (
      checkout.paymentMethod === "pago_movil" &&
      (checkout.exchangeRate === null || checkout.totalVes === null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Pago Móvil requiere una cotización VES válida.",
        path: ["exchangeRate"],
      });
    }
    if (
      checkout.paymentMethod !== "pago_movil" &&
      (checkout.exchangeRate !== null || checkout.totalVes !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "La cotización VES solo aplica a Pago Móvil.",
        path: ["exchangeRate"],
      });
    }
  });

const ocrPlatformSchema = z.enum([
  "zelle",
  "pago_movil",
  "binance_pay",
  "unknown",
]);
const ocrCurrencySchema = z.enum(["USD", "VES", "USDT", "unknown"]);
const ocrDateSchema = z
  .string()
  .trim()
  .max(40)
  .regex(
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?)?$/,
  );

const validOcrAnalysisSchema = z
  .object({
    valid: z.literal(true),
    status: z.literal("valid"),
    platform: z.enum(["zelle", "pago_movil", "binance_pay"]),
    amount: z.number().positive().finite(),
    currency: z.enum(["USD", "VES", "USDT"]),
    reference: z.string().trim().min(1).max(120),
    date: ocrDateSchema,
    reason_if_invalid: z.union([z.literal(""), z.null()]),
  })
  .strict();

const rejectedOcrAnalysisSchema = z
  .object({
    valid: z.literal(false),
    status: z.enum(["invalid", "unreadable"]),
    platform: ocrPlatformSchema,
    amount: z.number().nonnegative().finite().nullable(),
    currency: ocrCurrencySchema,
    reference: z.string().trim().min(1).max(120).nullable(),
    date: ocrDateSchema.nullable(),
    reason_if_invalid: z.string().trim().min(1).max(300),
  })
  .strict();

export const ocrAnalysisSchema = z.discriminatedUnion("valid", [
  validOcrAnalysisSchema,
  rejectedOcrAnalysisSchema,
]);

export type OcrAnalysis = z.infer<typeof ocrAnalysisSchema>;

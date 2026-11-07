import { z } from "zod";

const DECIMAL_PATTERN = /^\d+(\.\d{1,3})?$/;

const money = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, "El importe debe ser un entero en pesos (sin decimales)")
  .max(18, "Importe demasiado grande");

const quantity = z
  .number()
  .finite("La cantidad debe ser un número")
  .positive("La cantidad debe ser mayor que cero")
  .max(1_000_000, "Cantidad demasiado grande")
  .refine(
    (value) => DECIMAL_PATTERN.test(String(value)),
    "La cantidad admite como máximo 3 decimales",
  );

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

export const saleItemInputSchema = z.object({
  productId: z.uuid("Identificador de producto inválido"),
  variantId: z.uuid("Identificador de variante inválido").optional(),
  quantity,
});

export const saleCreateSchema = z.object({
  items: z
    .array(saleItemInputSchema)
    .min(1, "La venta debe tener al menos un producto")
    .max(100, "Demasiados productos en la venta"),
  customerId: z.uuid("Identificador de cliente inválido").optional(),
  discount: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("PERCENT"),
        percentBp: z
          .number()
          .int("Los puntos base deben ser enteros")
          .min(0)
          .max(10_000, "El descuento no puede superar el 100 %"),
      }),
      z.object({
        type: z.literal("AMOUNT"),
        amount: money,
      }),
    ])
    .optional(),
  notes: optionalText(500),
});

export const saleListQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  status: z
    .enum(["DRAFT", "PENDING_PAYMENT", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"])
    .optional(),
  customerId: z.uuid("Identificador de cliente inválido").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const paymentCreateSchema = z.object({
  methodCode: z.enum(["CASH", "TRANSFER", "CARD_SIMULATED", "CARD_SOFTPOS"]),
  amount: money,
  notes: optionalText(500),
});

export const saleCancelSchema = z
  .object({
    reason: optionalText(500),
  })
  .optional();

export const idempotencyKeySchema = z.uuid("La cabecera Idempotency-Key debe ser un UUID");

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
export type SaleListQuery = z.infer<typeof saleListQuerySchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type SaleCancelInput = z.infer<typeof saleCancelSchema>;

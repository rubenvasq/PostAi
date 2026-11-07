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

const discountSchema = z.discriminatedUnion("type", [
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
]);

export const cartCreateSchema = z.object({
  customerId: z.uuid("Identificador de cliente inválido").optional(),
  notes: optionalText(500),
});

// `null` limpia el campo opcional; ausente lo deja sin cambios.
export const cartUpdateSchema = z
  .object({
    customerId: z.uuid("Identificador de cliente inválido").nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    discount: discountSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.customerId !== undefined || value.notes !== undefined || value.discount !== undefined,
    "Debe enviar al menos un campo para actualizar",
  );

export const cartItemCreateSchema = z.object({
  productId: z.uuid("Identificador de producto inválido"),
  variantId: z.uuid("Identificador de variante inválido").optional(),
  quantity,
  notes: optionalText(500),
});

export const cartItemUpdateSchema = z
  .object({
    quantity: quantity.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    (value) => value.quantity !== undefined || value.notes !== undefined,
    "Debe enviar al menos un campo para actualizar",
  );

export type CartCreateInput = z.infer<typeof cartCreateSchema>;
export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;
export type CartItemCreateInput = z.infer<typeof cartItemCreateSchema>;
export type CartItemUpdateInput = z.infer<typeof cartItemUpdateSchema>;

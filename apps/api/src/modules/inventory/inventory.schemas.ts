import { z } from "zod";

const DECIMAL_PATTERN = /^-?\d+(\.\d{1,3})?$/;

const quantityDelta = z
  .number()
  .finite("La cantidad debe ser un número")
  .refine((value) => value !== 0, "El ajuste no puede ser cero")
  .refine(
    (value) => DECIMAL_PATTERN.test(String(value)),
    "La cantidad admite como máximo 3 decimales",
  );

export const inventoryAdjustmentSchema = z.object({
  quantityDelta,
  reason: z.string().trim().min(1, "El motivo es obligatorio").max(200, "Motivo demasiado largo"),
});

export const inventoryListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  lowStock: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const inventoryMovementListQuerySchema = z.object({
  productId: z.uuid("Identificador inválido").optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

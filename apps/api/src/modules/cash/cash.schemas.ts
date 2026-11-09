import { z } from "zod";

const nonNegativeMoney = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, "El importe debe ser un entero en pesos (sin decimales)")
  .max(18, "Importe demasiado grande");

const positiveMoney = nonNegativeMoney.refine(
  (value) => BigInt(value) > 0n,
  "El importe debe ser mayor que cero",
);

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

export const cashOpenSchema = z.object({
  openingAmount: nonNegativeMoney,
  notes: optionalText(500),
});

export const cashCloseSchema = z.object({
  closingAmount: nonNegativeMoney,
  notes: optionalText(500),
});

export const cashMovementCreateSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT"]),
  direction: z.enum(["IN", "OUT"]),
  amount: positiveMoney,
  description: optionalText(500),
});

export const cashListQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const expenseCreateSchema = z.object({
  category: z
    .string()
    .trim()
    .min(1, "La categoría es obligatoria")
    .max(80, "Categoría demasiado larga"),
  amount: positiveMoney,
  description: optionalText(500),
  incurredAt: z.iso.datetime({ offset: true }).optional(),
  sessionId: z.uuid("Identificador de sesión inválido").optional(),
});

export const expenseListQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

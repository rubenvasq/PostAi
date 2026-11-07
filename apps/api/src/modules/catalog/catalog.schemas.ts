import { z } from "zod";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

const money = z
  .string()
  .trim()
  .regex(/^[0-9]+$/, "El importe debe ser un entero en pesos (sin decimales)")
  .max(18, "Importe demasiado grande");

const color = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido (#RRGGBB)")
  .optional();

const boolFromQuery = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  color,
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    color,
    sortOrder: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debe indicar al menos un campo a actualizar",
  });

export const categoryListQuerySchema = z.object({ active: boolFromQuery });

// ---------------------------------------------------------------------------
// Impuestos
// ---------------------------------------------------------------------------

export const taxRateCreateSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  rateBp: z.number().int().min(0).max(10000),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export const productCreateSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  sku: optionalText(64),
  barcode: optionalText(64),
  description: optionalText(500),
  categoryId: z.uuid().optional(),
  taxRateId: z.uuid().optional(),
  price: money,
  trackInventory: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const productUpdateSchema = z
  .object({
    type: z.enum(["PRODUCT", "SERVICE"]).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    sku: optionalText(64),
    barcode: optionalText(64),
    description: optionalText(500),
    categoryId: z.uuid().nullable().optional(),
    taxRateId: z.uuid().nullable().optional(),
    price: money.optional(),
    trackInventory: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debe indicar al menos un campo a actualizar",
  });

export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: z.uuid().optional(),
  active: boolFromQuery,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

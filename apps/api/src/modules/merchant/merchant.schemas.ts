import { z } from "zod";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

export const merchantUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre del comercio es obligatorio").max(120).optional(),
    legalName: optionalText(200),
    taxId: optionalText(50),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debe indicar al menos un campo a actualizar",
  });

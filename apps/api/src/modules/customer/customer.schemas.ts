import { z } from "zod";

const emailText = z
  .string()
  .trim()
  .max(254, "Correo demasiado largo")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Correo inválido")
  .transform((value) => (value === "" ? null : value.toLowerCase()));

const optionalEmail = z.union([emailText, z.null()]).optional();

const optionalText = (maxLength: number, message?: string) =>
  z
    .union([z.string().trim().max(maxLength, message), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const name = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "Nombre demasiado largo");

export const customerCreateSchema = z.object({
  name,
  email: optionalEmail,
  phone: optionalText(30, "Teléfono demasiado largo"),
  taxId: optionalText(50, "Identificación tributaria demasiado larga"),
  notes: optionalText(500, "Notas demasiado largas"),
});

export const customerUpdateSchema = z
  .object({
    name: name.optional(),
    email: optionalEmail,
    phone: optionalText(30, "Teléfono demasiado largo"),
    taxId: optionalText(50, "Identificación tributaria demasiado larga"),
    notes: optionalText(500, "Notas demasiado largas"),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "Debe indicar al menos un campo a actualizar",
  });

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

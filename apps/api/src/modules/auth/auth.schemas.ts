import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Correo inválido"))
  .pipe(z.string().max(254));

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  merchantName: z.string().trim().min(1, "El nombre del comercio es obligatorio").max(120),
  merchantLegalName: optionalText(200),
  merchantTaxId: optionalText(50),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria").max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(20, "Refresh token inválido").max(200),
});

export const logoutSchema = refreshSchema;

export const sessionIdSchema = z.uuid("Identificador de sesión inválido");

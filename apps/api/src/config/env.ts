import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1).default("postgresql://postai:postai@127.0.0.1:5432/postai"),
  CORS_ORIGIN: z.string().min(1).default("http://127.0.0.1:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[api] Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

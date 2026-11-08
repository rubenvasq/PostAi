import { z } from "zod";

export const DEV_JWT_SECRET = "postai-dev-only-secret-change-me-32chars";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().max(65535).default(3000),
    DATABASE_URL: z.string().min(1).default("postgresql://postai:postai@127.0.0.1:5432/postai"),
    CORS_ORIGIN: z.string().min(1).default("http://127.0.0.1:5173"),
    JWT_SECRET: z.string().min(32).default(DEV_JWT_SECRET),
    JWT_ISSUER: z.string().min(1).default("postai-api"),
    JWT_AUDIENCE: z.string().min(1).default("postai-clients"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().max(86400).default(900),
    AUTH_LOGIN_MAX_ATTEMPTS_PER_EMAIL: z.coerce.number().int().positive().max(1000).default(5),
    AUTH_LOGIN_MAX_ATTEMPTS_PER_IP: z.coerce.number().int().positive().max(1000).default(30),
    AUTH_REFRESH_MAX_ATTEMPTS_PER_IP: z.coerce.number().int().positive().max(1000).default(60),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET debe configurarse con un valor propio en producción",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[api] Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

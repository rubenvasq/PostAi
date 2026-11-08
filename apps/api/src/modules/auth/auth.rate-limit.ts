import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { createAttemptRateLimiter, type AttemptRateLimiter } from "../../lib/rate-limiter.js";
import { AppError } from "../../middleware/error-handler.js";

export interface AuthRateLimiters {
  loginByEmail: AttemptRateLimiter;
  loginByIp: AttemptRateLimiter;
  refreshByIp: AttemptRateLimiter;
}

export interface AuthRateLimitOptions {
  windowMs?: number;
  loginMaxAttemptsPerEmail?: number;
  loginMaxAttemptsPerIp?: number;
  refreshMaxAttemptsPerIp?: number;
  now?: () => number;
}

export class RateLimitExceededError extends AppError {
  constructor(retryAfterSeconds: number) {
    super(
      429,
      "RATE_LIMITED",
      "Demasiados intentos. Intenta de nuevo más tarde.",
      { retryAfterSeconds },
      { "Retry-After": String(retryAfterSeconds) },
    );
    this.name = "RateLimitExceededError";
  }
}

export function createAuthRateLimiters(options: AuthRateLimitOptions = {}): AuthRateLimiters {
  const windowMs = options.windowMs ?? env.AUTH_RATE_LIMIT_WINDOW_SECONDS * 1000;

  return {
    loginByEmail: createAttemptRateLimiter({
      maxAttempts: options.loginMaxAttemptsPerEmail ?? env.AUTH_LOGIN_MAX_ATTEMPTS_PER_EMAIL,
      windowMs,
      now: options.now,
    }),
    loginByIp: createAttemptRateLimiter({
      maxAttempts: options.loginMaxAttemptsPerIp ?? env.AUTH_LOGIN_MAX_ATTEMPTS_PER_IP,
      windowMs,
      now: options.now,
    }),
    refreshByIp: createAttemptRateLimiter({
      maxAttempts: options.refreshMaxAttemptsPerIp ?? env.AUTH_REFRESH_MAX_ATTEMPTS_PER_IP,
      windowMs,
      now: options.now,
    }),
  };
}

/**
 * Deriva una clave estable sin guardar el correo o la IP en claro.
 */
export function rateLimitKey(scope: string, value: string): string {
  const digest = createHash("sha256").update(value, "utf8").digest("base64url");

  return `${scope}:${digest}`;
}

export function enforceRateLimit(limiter: AttemptRateLimiter, key: string): void {
  const decision = limiter.check(key);

  if (!decision.allowed) {
    throw new RateLimitExceededError(decision.retryAfterSeconds);
  }
}

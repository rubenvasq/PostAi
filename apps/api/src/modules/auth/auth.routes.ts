import type { Request } from "express";
import { Router } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { createRequireAuth, getAuthUser } from "../../middleware/require-auth.js";
import { enforceRateLimit, rateLimitKey, type AuthRateLimiters } from "./auth.rate-limit.js";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  sessionIdSchema,
} from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";
import type { DeviceContext } from "./auth.types.js";

const MAX_DEVICE_FIELD_LENGTH = 200;

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_DEVICE_FIELD_LENGTH);
}

function deviceContextFrom(req: Request): DeviceContext {
  return {
    deviceName: trimToNull(req.header("x-device-name")),
    userAgent: trimToNull(req.header("user-agent")),
    ipAddress: trimToNull(req.ip),
  };
}

function clientKey(scope: string, req: Request): string {
  return rateLimitKey(scope, req.ip ?? "unknown");
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof AppError && error.statusCode === 401;
}

export function createAuthRouter(service: AuthService, rateLimiters: AuthRateLimiters): Router {
  const router = Router();
  const requireAuth = createRequireAuth(service);

  router.post("/register", async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await service.register(input, deviceContextFrom(req));
    res.status(201).json(result);
  });

  router.post("/login", async (req, res) => {
    const input = loginSchema.parse(req.body);
    const ipKey = clientKey("login-ip", req);
    const emailKey = rateLimitKey("login-email", input.email.toLowerCase());

    enforceRateLimit(rateLimiters.loginByIp, ipKey);
    enforceRateLimit(rateLimiters.loginByEmail, emailKey);

    try {
      const result = await service.login(input, deviceContextFrom(req));
      rateLimiters.loginByEmail.reset(emailKey);
      res.status(200).json(result);
    } catch (error) {
      if (isUnauthorized(error)) {
        rateLimiters.loginByIp.recordFailure(ipKey);
        rateLimiters.loginByEmail.recordFailure(emailKey);
      }

      throw error;
    }
  });

  router.post("/refresh", async (req, res) => {
    const input = refreshSchema.parse(req.body);
    const ipKey = clientKey("refresh-ip", req);

    enforceRateLimit(rateLimiters.refreshByIp, ipKey);

    try {
      const result = await service.refresh(input, deviceContextFrom(req));
      res.status(200).json(result);
    } catch (error) {
      if (isUnauthorized(error)) {
        rateLimiters.refreshByIp.recordFailure(ipKey);
      }

      throw error;
    }
  });

  router.post("/logout", requireAuth, async (req, res) => {
    const user = getAuthUser(res);
    const input = logoutSchema.parse(req.body);
    await service.logout(user.id, input);
    res.status(204).end();
  });

  router.get("/me", requireAuth, async (_req, res) => {
    const user = getAuthUser(res);
    const result = await service.getMe(user);
    res.status(200).json(result);
  });

  router.get("/sessions", requireAuth, async (_req, res) => {
    const user = getAuthUser(res);
    const result = await service.listSessions(user.id);
    res.status(200).json(result);
  });

  router.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
    const user = getAuthUser(res);
    const sessionId = sessionIdSchema.parse(req.params.sessionId);
    await service.revokeSession(user.id, sessionId);
    res.status(204).end();
  });

  return router;
}

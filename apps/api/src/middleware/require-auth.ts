import type { RequestHandler, Response } from "express";
import type { AuthService } from "../modules/auth/auth.service.js";
import type { UserRecord } from "../modules/auth/auth.types.js";
import { AppError } from "./error-handler.js";

export function createRequireAuth(service: AuthService): RequestHandler {
  return async (req, res, next) => {
    const header = req.header("authorization");
    const [scheme, token, ...rest] = header?.split(" ") ?? [];

    if (scheme?.toLowerCase() !== "bearer" || !token || rest.length > 0) {
      next(new AppError(401, "UNAUTHORIZED", "Autenticación requerida"));
      return;
    }

    try {
      res.locals.authUser = await service.authenticate(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getAuthUser(res: Response): UserRecord {
  const user = res.locals.authUser as UserRecord | undefined;

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Autenticación requerida");
  }

  return user;
}

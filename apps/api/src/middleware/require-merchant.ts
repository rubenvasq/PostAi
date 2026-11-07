import type { RequestHandler, Response } from "express";
import type { MerchantService } from "../modules/merchant/merchant.service.js";
import type { MerchantContext } from "../modules/merchant/merchant.types.js";
import { getAuthUser } from "./require-auth.js";
import { AppError } from "./error-handler.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createRequireMerchant(service: MerchantService): RequestHandler {
  return async (req, res, next) => {
    const merchantId = req.header("x-merchant-id");

    if (!merchantId || !UUID_PATTERN.test(merchantId)) {
      next(new AppError(403, "FORBIDDEN", "Cabecera X-Merchant-Id ausente o inválida"));
      return;
    }

    try {
      const user = getAuthUser(res);
      res.locals.merchantContext = await service.resolveContext(user.id, merchantId);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getMerchantContext(res: Response): MerchantContext {
  const context = res.locals.merchantContext as MerchantContext | undefined;

  if (!context) {
    throw new AppError(403, "FORBIDDEN", "Contexto de comercio no resuelto");
  }

  return context;
}

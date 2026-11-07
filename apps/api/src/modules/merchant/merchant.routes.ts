import { Router, type RequestHandler } from "express";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import { merchantUpdateSchema } from "./merchant.schemas.js";
import type { MerchantService } from "./merchant.service.js";

export function createMerchantRouter(
  service: MerchantService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();

  router.use(requireAuth, requireMerchant);

  router.get("/merchant", async (_req, res) => {
    const result = await service.getMerchant(getMerchantContext(res));
    res.status(200).json(result);
  });

  router.patch("/merchant", async (req, res) => {
    const input = merchantUpdateSchema.parse(req.body);
    const result = await service.updateMerchant(getMerchantContext(res), input);
    res.status(200).json(result);
  });

  router.get("/branches", async (_req, res) => {
    const data = await service.listBranches(getMerchantContext(res));
    res.status(200).json({ data });
  });

  return router;
}

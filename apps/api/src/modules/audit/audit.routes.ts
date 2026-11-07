import { Router, type RequestHandler } from "express";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import { auditListQuerySchema } from "./audit.schemas.js";
import type { AuditService } from "./audit.service.js";

export function createAuditRouter(
  service: AuditService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/audit-logs", async (req, res) => {
    const query = auditListQuerySchema.parse(req.query);
    const result = await service.list(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  return router;
}

import { Router, type RequestHandler } from "express";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import { dashboardQuerySchema, salesReportQuerySchema } from "./report.schemas.js";
import type { ReportService } from "./report.service.js";

export function createReportRouter(
  service: ReportService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/dashboard/summary", async (req, res) => {
    const query = dashboardQuerySchema.parse(req.query);
    const summary = await service.getDashboardSummary(getMerchantContext(res), query);
    res.status(200).json(summary);
  });

  router.get("/reports/sales", async (req, res) => {
    const query = salesReportQuerySchema.parse(req.query);
    const report = await service.getSalesReport(getMerchantContext(res), query);
    res.status(200).json(report);
  });

  return router;
}
